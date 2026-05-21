// main.js
// Entry point — builds the HTML layout and wires everything together.
//
// I'm doing the layout in JavaScript (template strings) rather than a separate
// HTML file so the whole thing stays as a single-page vanilla JS app that can
// be opened directly from disk without a build step.
//
// The wiring order matters:
//   1. Build the DOM
//   2. Init components (they grab their elements by ID)
//   3. Attach event listeners

import { initClipList }  from "./components/ClipList.js";
import { initTimeline, moveScrubber }  from "./components/Timeline.js";
import { initPlayer, toggleVideo, setRate } from "./components/VideoPlayer.js";
import { appState, onStateChange }          from "./store/appState.js";
import { seekToTime, clipEnded, nextClip, previousClip, resumePlayback, pausePlayback, loadVideoList } from "./components/PlaybackController.js";

// ─── Build the full page layout ───────────────────────────────────────────────

document.getElementById("root").innerHTML =
  '<div class="app">'

  // Header bar
  + '<header class="header">'
  +   '<div class="logo"><span class="logo-icon">&#128247;</span><span class="logo-name">okDriver</span></div>'
  +   '<div class="sep"></div>'
  +   '<span class="page-title">DVR History Playback</span>'
  +   '<div class="header-right">'
  +     '<span class="live-dot-wrap"><span class="live-dot"></span>LIVE</span>'
  +     '<div class="sep"></div>'
  +     '<span class="meta">VEHICLE: <b id="hVehicle">DL5CJ7355</b></span>'
  +     '<div class="sep"></div>'
  +     '<span class="meta">IMEI: <b>864993060968006</b></span>'
  +   '</div>'
  + '</header>'

  + '<div class="body">'

  // Left sidebar — search form, queue status bar, clip list
  +   '<aside class="sidebar">'
  +     '<div class="sidebar-form">'
  +       '<label class="form-label">VEHICLE / IMEI</label>'
  +       '<input class="form-input" id="inputImei" value="864993060968006" />'
  +       '<label class="form-label">DATE</label>'
  +       '<input class="form-input" id="inputDate" type="date" value="2026-05-07" />'
  +       '<label class="form-label">CAMERA</label>'
  +       '<div class="cam-row">'
  +         '<button class="cam-btn active" data-cam="Forward">Forward</button>'
  +         '<button class="cam-btn" data-cam="Inward">Inward</button>'
  +         '<button class="cam-btn" data-cam="Both">Both</button>'
  +       '</div>'
  +       '<div class="btn-row">'
  +         '<button class="btn btn-blue" id="btnSearch">Search</button>'
  +         '<button class="btn" id="btnRefresh">&#8635; Refresh</button>'
  +       '</div>'
  +     '</div>'
  +     '<div id="queueBar" class="queue-bar"></div>'
  +     '<div class="clip-list-wrap"><div id="clipListEl" class="clip-list"></div></div>'
  +   '</aside>'

  // Main content area — video player, controls, timeline
  +   '<div class="content">'

  +     '<div class="video-area">'
  +       '<div class="video-pane" id="videoPane">'
  +         '<div class="cam-label">FORWARD CAM</div>'
  +         '<video id="mainVideo" playsinline controls></video>'

  // HUD overlay — shows current timestamp and clip label on top of video
  +         '<div class="hud">'
  +           '<div class="hud-top">'
  +             '<div class="hud-chip" id="hTimestamp">--:--:--</div>'
  +             '<div class="hud-chip" id="hClipLabel"></div>'
  +           '</div>'
  +         '</div>'

  // Loading screen — shown while waiting for device upload
  +         '<div class="loading-screen" id="loadScreen">'
  +           '<div class="spinner"></div>'
  +           '<div class="loading-msg" id="loadMsg">Select a date and click Search.</div>'
  +           '<div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>'
  +         '</div>'
  +       '</div>'
  +     '</div>'

  // Playback controls row
  +     '<div class="controls-bar">'
  +       '<button class="ctrl-btn" id="btnBack">&#9198;</button>'
  +       '<button class="ctrl-btn" id="btnPrev">&#9194;</button>'
  +       '<button class="ctrl-btn active" id="btnPlay">&#9208;</button>'
  +       '<button class="ctrl-btn" id="btnNext">&#9193;</button>'
  +       '<div class="bar-sep"></div>'
  +       '<div class="speed-row">'
  +         '<span class="speed-label">SPEED</span>'
  +         '<button class="speed-btn" data-rate="0.5">0.5x</button>'
  +         '<button class="speed-btn active" data-rate="1">1x</button>'
  +         '<button class="speed-btn" data-rate="2">2x</button>'
  +         '<button class="speed-btn" data-rate="4">4x</button>'
  +       '</div>'
  +       '<div class="bar-sep"></div>'
  +       '<div class="clip-info-right">'
  +         '<div id="clipLabel">No clip loaded</div>'
  +         '<div id="clipTime" class="clip-time">--</div>'
  +       '</div>'
  +     '</div>'

  // Timeline section
  +     '<div class="timeline-section"><div id="tlContainer"></div>'
  +       '<div class="tl-legend">'
  +         '<span class="leg-item"><span class="leg-dot fwd"></span>Forward Cam</span>'
  +         '<span class="leg-item"><span class="leg-dot in"></span>Inward Cam</span>'
  +         '<span class="leg-item"><span class="leg-dot cur"></span>Current position</span>'
  +       '</div>'
  +     '</div>'

  +   '</div>'
  + '</div>'
  + '</div>';

// ─── Init components ──────────────────────────────────────────────────────────

initClipList(document.getElementById("clipListEl"));

// Pass seekToTime as the seek callback so timeline clicks go through the controller
initTimeline(
  document.getElementById("tlContainer"),
  function(ms) { seekToTime(ms); }
);

// Pass clipEnded so VideoPlayer can trigger auto-advance,
// and updateHud so timeupdate moves the scrubber and HUD clock
initPlayer(
  document.getElementById("mainVideo"),
  function()   { clipEnded(); },
  function(ms) { updateHud(ms); }
);

// ─── Subscribe to state changes ───────────────────────────────────────────────

// Show / hide the loading overlay based on player state
onStateChange(function(s) {
  var screen = document.getElementById("loadScreen");
  if (screen) {
    var show = (
      s.playerState === "idle"     ||
      s.playerState === "loading"  ||
      s.playerState === "error"    ||
      s.playerState === "buffering"
    );
    screen.style.display = show ? "flex" : "none";
  }

  var msg = document.getElementById("loadMsg");
  if (msg) msg.textContent = s.statusMsg || "";
});

// ─── Event listeners ──────────────────────────────────────────────────────────

document.getElementById("btnSearch").addEventListener("click", function() {
  // Read the current form values into app state before searching
  appState.imei = document.getElementById("inputImei").value.trim();
  appState.date = document.getElementById("inputDate").value;
  loadVideoList(true); // true = force API 1 refresh
});

document.getElementById("btnRefresh").addEventListener("click", function() {
  loadVideoList(true);
});

document.getElementById("btnPlay").addEventListener("click", function() {
  toggleVideo();
});

document.getElementById("btnNext").addEventListener("click", function() {
  nextClip();
});

document.getElementById("btnPrev").addEventListener("click", function() {
  previousClip();
});

// Seek back 30 seconds within the current clip
document.getElementById("btnBack").addEventListener("click", function() {
  var video = document.getElementById("mainVideo");
  if (video) {
    video.currentTime = Math.max(0, video.currentTime - 30);
  }
});

// Speed buttons
document.querySelectorAll(".speed-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    // Update active state styling
    document.querySelectorAll(".speed-btn").forEach(function(b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    setRate(parseFloat(btn.dataset.rate));
  });
});

// Camera selector buttons — switch between Forward / Inward / Both
document.querySelectorAll(".cam-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".cam-btn").forEach(function(b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    appState.camera = btn.dataset.cam;

    // Update the camera label overlay on the video
    var camLabel = document.querySelector(".cam-label");
    if (camLabel) {
      camLabel.textContent = appState.camera === "Inward" ? "INWARD CAM" : "FORWARD CAM";
    }
  });
});

// ─── HUD updater ──────────────────────────────────────────────────────────────

// Called on every video timeupdate event (~4x per second).
// Converts the current playback position to a wall-clock time for the HUD
// and moves the timeline scrubber.
function updateHud(ms) {
  var el = document.getElementById("hTimestamp");
  if (el) {
    var d = new Date(ms);
    el.textContent =
      twoDigit(d.getHours())   + ":" +
      twoDigit(d.getMinutes()) + ":" +
      twoDigit(d.getSeconds());
  }

  // Move the red scrubber line on the timeline
  moveScrubber(ms);
}

function twoDigit(n) { return n < 10 ? "0" + n : n; }
