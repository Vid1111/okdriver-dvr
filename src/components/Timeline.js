// Timeline.js
// Renders the interactive history timeline bar and handles click/drag seeking.
//
// The timeline shows two horizontal tracks (FWD and IN camera) across the
// full time span of available recordings. Colored segments show where clips
// exist. A vertical scrubber line moves in real-time as video plays.
//
// When the user clicks or drags on the timeline, we convert the click position
// to a millisecond timestamp and pass it to the seekToTime() callback.

import {
  appState
} from "../store/appState.js";

import {
  CLIP_DURATION
} from "../utils/clipUtils.js";

import {
  seekToTime
} from "./PlaybackController.js";

var tlContainer = null;
var tlSeekCb    = null;  // called with a ms timestamp when user clicks

// initTimeline()
// Creates the timeline DOM structure inside the given element.
// onSeek is called with a millisecond timestamp whenever the user clicks.
export function initTimeline(el, onSeek) {
  tlContainer = el;
  tlSeekCb    = onSeek;

  // Build the timeline layout — two camera tracks + a scrubber line
  el.innerHTML =
    '<div class="tl-header">'
    + '<span class="tl-title">HISTORY TIMELINE</span>'
    + '<span class="tl-curtime" id="tlCurTime">--:--:--</span>'
    + '</div>'

    + '<div class="tl-body" id="tlBody">'

    + '<div class="tl-row">'
    + '<span class="tl-rowlabel">FWD</span>'
    + '<div class="tl-track" id="tlFwdTrack"></div>'
    + '</div>'

    + '<div class="tl-row">'
    + '<span class="tl-rowlabel">IN</span>'
    + '<div class="tl-track" id="tlInTrack"></div>'
    + '</div>'

    // The scrubber is a vertical red line that moves over the tracks
    + '<div class="tl-scrubber" id="tlScrubber"></div>'

    + '</div>'

    + '<div class="tl-hourlabels" id="tlHourLabels"></div>';

  var body = document.getElementById("tlBody");

  // Single click to seek
  body.addEventListener("click", handleSeek);

  // Click-and-drag to scrub through time
  body.addEventListener("mousemove", function(e) {
    if (e.buttons === 1) {
      handleSeek(e);
    }
  });
}

// renderTimeline()
// Fills in the clip segments on both camera tracks.
// Called after the video list is loaded and parsed.
export function renderTimeline(tl) {
  if (!tl) return;

  var span = tl.end - tl.start;

  drawSegments("tlFwdTrack", tl.fwdClips, tl.start, span, "tl-fwd");
  drawSegments("tlInTrack",  tl.inClips,  tl.start, span, "tl-in");
}

// drawSegments()
// Renders one set of clips onto a track as absolutely-positioned divs.
// Each segment's left% and width% are calculated from the clip's timestamp
// relative to the full timeline span.
function drawSegments(trackId, clipList, start, span, cls) {
  var el = document.getElementById(trackId);
  if (!el) return;

  el.innerHTML = "";

  clipList.forEach(function(c) {
    var left  = ((c.timestamp - start) / span) * 100;
    var width = (CLIP_DURATION * 1000 / span) * 100;

    var seg       = document.createElement("div");
    seg.className = "tl-segment " + cls;
    seg.style.left  = left.toFixed(2) + "%";
    seg.style.width = width.toFixed(2) + "%";

    el.appendChild(seg);
  });
}

// moveScrubber()
// Updates the scrubber line position. Called from main.js on video timeupdate.
// ms is the current playback position as a wall-clock millisecond timestamp.
export function moveScrubber(ms) {
  var tl = appState.timeline;
  if (!tl) return;

  var pct = Math.max(0, Math.min(100,
    ((ms - tl.start) / (tl.end - tl.start)) * 100
  ));

  var scrubber = document.getElementById("tlScrubber");
  if (scrubber) {
    scrubber.style.left = pct + "%";
  }

  // Also update the current-time readout in the timeline header
  var timeEl = document.getElementById("tlCurTime");
  if (timeEl) {
    var d = new Date(ms);
    timeEl.textContent =
      twoDigit(d.getHours()) + ":" +
      twoDigit(d.getMinutes()) + ":" +
      twoDigit(d.getSeconds());
  }
}

// handleSeek()
// Converts a mouse event on the timeline body into a timestamp and calls the seek callback.
function handleSeek(e) {
  var body = document.getElementById("tlBody");
  if (!body || !appState.timeline) return;

  var rect = body.getBoundingClientRect();

  // Clamp to [0, 1] so clicking outside the track doesn't cause issues
  var pct = Math.max(0, Math.min(1,
    (e.clientX - rect.left) / rect.width
  ));

  var tl     = appState.timeline;
  var target = tl.start + pct * (tl.end - tl.start);

  if (tlSeekCb) {
    tlSeekCb(target);
  }
}

function twoDigit(n) { return String(n).padStart(2, "0"); }
