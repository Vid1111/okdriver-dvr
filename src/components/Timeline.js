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
var tlSeekCb = null;

export function initTimeline(
  el,
  onSeek
) {

  tlContainer = el;
  tlSeekCb = onSeek;

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

    + '<div class="tl-scrubber" id="tlScrubber"></div>'

    + '</div>'

    + '<div class="tl-hourlabels" id="tlHourLabels"></div>';

  var body =
    document.getElementById(
      "tlBody"
    );

  body.addEventListener(
    "click",
    handleSeek
  );

  body.addEventListener(
    "mousemove",
    function(e) {

      if (e.buttons === 1) {
        handleSeek(e);
      }

    }
  );
}

export function renderTimeline(tl) {

  if (!tl) return;

  var span =
    tl.end - tl.start;

  drawSegments(
    "tlFwdTrack",
    tl.fwdClips,
    tl.start,
    span,
    "tl-fwd"
  );

  drawSegments(
    "tlInTrack",
    tl.inClips,
    tl.start,
    span,
    "tl-in"
  );
}

function drawSegments(
  trackId,
  clipList,
  start,
  span,
  cls
) {

  var el =
    document.getElementById(
      trackId
    );

  if (!el) return;

  el.innerHTML = "";

  clipList.forEach(function(c) {

    var left =
      (
        (c.timestamp - start)
        / span
      ) * 100;

    var width =
      (
        CLIP_DURATION * 1000
        / span
      ) * 100;

    var seg =
      document.createElement(
        "div"
      );

    seg.className =
      "tl-segment " + cls;

    seg.style.left =
      left.toFixed(2) + "%";

    seg.style.width =
      width.toFixed(2) + "%";

    el.appendChild(seg);

  });
}

export function moveScrubber(ms) {

  var tl =
    appState.timeline;

  if (!tl) return;

  var pct =
    Math.max(
      0,
      Math.min(
        100,
        (
          (ms - tl.start)
          / (tl.end - tl.start)
        ) * 100
      )
    );

  var scrubber =
    document.getElementById(
      "tlScrubber"
    );

  if (scrubber) {
    scrubber.style.left =
      pct + "%";
  }
}

function handleSeek(e) {

  var body =
    document.getElementById(
      "tlBody"
    );

  if (
    !body ||
    !appState.timeline
  ) return;

  var rect =
    body.getBoundingClientRect();

  var pct =
    Math.max(
      0,
      Math.min(
        1,
        (
          e.clientX - rect.left
        ) / rect.width
      )
    );

  var tl =
    appState.timeline;

  var target =
    tl.start +
    pct * (
      tl.end - tl.start
    );

  if (tlSeekCb) {
    tlSeekCb(target);
  }
}