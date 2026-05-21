import {
  initClipList
} from "./components/ClipList.js";

import {
  initTimeline
} from "./components/Timeline.js";

import {
  initPlayer,
  toggleVideo,
  setRate
} from "./components/VideoPlayer.js";

import {
  appState,
  onStateChange
} from "./store/appState.js";

import {
  seekToTime,
  clipEnded
} from "./components/PlaybackController.js";

import {
  nextClip,
  previousClip,
  resumePlayback,
  pausePlayback
} from "./components/PlaybackController.js";

import {
  loadVideoList
} from "./components/PlaybackController.js";

document.getElementById("root").innerHTML =
  '<div class="app">'

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

  +   '<div class="content">'

  +     '<div class="video-area">'
  +       '<div class="video-pane" id="videoPane">'
  +         '<div class="cam-label">FORWARD CAM</div>'
  +         '<video id="mainVideo" playsinline controls></video>'
  +         '<div class="hud">'
  +           '<div class="hud-top">'
  +             '<div class="hud-chip" id="hTimestamp">--:--:--</div>'
  +             '<div class="hud-chip" id="hClipLabel"></div>'
  +           '</div>'
  +         '</div>'
  +         '<div class="loading-screen" id="loadScreen">'
  +           '<div class="spinner"></div>'
  +           '<div class="loading-msg" id="loadMsg">Select a date and click Search.</div>'
  +           '<div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>'
  +         '</div>'
  +       '</div>'
  +     '</div>'

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

initClipList(document.getElementById("clipListEl"));

initTimeline(
  document.getElementById("tlContainer"),
  function(ms) {
    seekToTime(ms);
  }
);

initPlayer(
  document.getElementById("mainVideo"),
  function() {
    clipEnded();
  },
  function(ms) {
    updateHud(ms);
  }
);

onStateChange(function(s) {
  var screen = document.getElementById("loadScreen");

  if (screen) {
    var show =
      s.playerState === "idle" ||
      s.playerState === "loading" ||
      s.playerState === "error" ||
      s.playerState === "buffering";

    screen.style.display =
      show ? "flex" : "none";
  }

  var msg =
    document.getElementById("loadMsg");

  if (msg)
    msg.textContent =
      s.statusMsg || "";
});

document
  .getElementById("btnSearch")
  .addEventListener("click", function() {

    appState.imei =
      document
        .getElementById("inputImei")
        .value
        .trim();

    appState.date =
      document
        .getElementById("inputDate")
        .value;

    loadVideoList(true);

  });

document
  .getElementById("btnRefresh")
  .addEventListener("click", function() {
    loadVideoList(true);
  });

document
  .getElementById("btnPlay")
  .addEventListener("click", function() {

    toggleVideo();

  });

document
  .getElementById("btnNext")
  .addEventListener("click", function() {

    nextClip();

  });

document
  .getElementById("btnPrev")
  .addEventListener("click", function() {

    previousClip();

  });

document
  .querySelectorAll(".speed-btn")
  .forEach(function(btn) {
    btn.addEventListener(
      "click",
      function() {
        setRate(
          parseFloat(
            btn.dataset.rate
          )
        );
      }
    );
  });

function updateHud(ms) {
  var el =
    document.getElementById(
      "hTimestamp"
    );

  if (!el) return;

  var d = new Date(ms);

  el.textContent =
    twoDigit(d.getHours()) +
    ":" +
    twoDigit(d.getMinutes()) +
    ":" +
    twoDigit(d.getSeconds());
}

function twoDigit(n) {
  return n < 10 ? "0" + n : n;
}

// FIX: wire camera selector buttons to appState.camera
document
  .querySelectorAll(".cam-btn")
  .forEach(function(btn) {
    btn.addEventListener("click", function() {
      document
        .querySelectorAll(".cam-btn")
        .forEach(function(b) { b.classList.remove("active"); });

      btn.classList.add("active");

      appState.camera = btn.dataset.cam;

      // Update CAM LABEL overlay
      var camLabel = document.querySelector(".cam-label");
      if (camLabel) {
        camLabel.textContent =
          appState.camera === "Inward" ? "INWARD CAM" : "FORWARD CAM";
      }
    });
  });

// FIX: wire btnBack (seek back 30s in current clip)
document
  .getElementById("btnBack")
  .addEventListener("click", function() {
    var video = document.getElementById("mainVideo");
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 30);
    }
  });
