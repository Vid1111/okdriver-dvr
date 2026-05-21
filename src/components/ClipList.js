// ClipList.js
// Renders the scrollable list of clips in the left sidebar.
//
// Each clip shows its start time, camera type, and a queue status badge
// (READY / LOADING / QUEUED / ERROR) so the user can see which clips are
// pre-fetched and which are still being requested from the device.
//
// Clicking a clip row calls seekToTime() with that clip's timestamp,
// which is the same function the timeline uses — so both interaction
// points go through the same seek logic.

import {
  appState
} from "../store/appState.js";

import {
  getQueueSnapshot
} from "../store/clipQueue.js";

import {
  seekToTime
} from "./PlaybackController.js";

var clipListEl = null;

// initClipList()
// Pass the container element in once on startup.
export function initClipList(el) {
  clipListEl = el;
}

// renderClipList()
// Re-renders the full clip list. Called after video list loads and after
// every queue state change so the badges stay current.
export function renderClipList() {
  if (!clipListEl) return;

  // Use activeClips if a session is running, otherwise fall back to all fwd clips
  var clips = appState.activeClips.length
    ? appState.activeClips
    : (appState.timeline ? appState.timeline.fwdClips : []);

  if (!clips.length) {
    clipListEl.innerHTML = '<div class="cl-empty">No clips loaded.</div>';
    return;
  }

  // Build a quick lookup from clip index -> queue entry so we can show status badges
  var qsnap = getQueueSnapshot();
  var qmap  = {};
  qsnap.forEach(function(e) { qmap[e.idx] = e; });

  clipListEl.innerHTML = clips.map(function(c, i) {

    var isActive = i === appState.currentIdx;
    var qentry   = qmap[i];
    var qs       = qentry ? qentry.status : "";

    // Build the status badge based on queue state
    var badge = "";
    if (qs === "ready")      badge = '<span class="cl-badge qs-ready">READY</span>';
    if (qs === "polling")    badge = '<span class="cl-badge qs-polling">LOADING</span>';
    if (qs === "requesting") badge = '<span class="cl-badge qs-requesting">QUEUED</span>';
    if (qs === "error")      badge = '<span class="cl-badge qs-error">ERROR</span>';

    return (
      '<div class="cl-item' + (isActive ? " active" : "") + '" data-ts="' + c.timestamp + '">'
      + '<div class="cl-time">' + c.displayTime + '</div>'
      + '<div class="cl-info">'
      + '<div class="cl-cam">' + c.cameraType + '</div>'
      + '<div class="cl-dur">3:00</div>'
      + '</div>'
      + badge
      + '</div>'
    );

  }).join("");

  // Wire up click handlers on all the rows
  clipListEl.querySelectorAll(".cl-item").forEach(function(el) {
    el.addEventListener("click", function() {
      seekToTime(Number(el.dataset.ts));
    });
  });
}

// updateQueueBar()
// Updates the small queue status strip above the clip list that shows
// NOW / +1 / +2 / +3 with their upload states.
export function updateQueueBar() {
  var bar = document.getElementById("queueBar");
  if (!bar) return;

  var snap = getQueueSnapshot();

  if (!snap.length) {
    bar.innerHTML = "";
    return;
  }

  bar.innerHTML = snap.map(function(e, i) {
    var label = i === 0 ? "NOW" : "+" + i;
    return (
      '<div class="qb-item qb-' + e.status + '">'
      + '<span>' + label + '</span>'
      + '<span>' + e.clip.displayTime + '</span>'
      + '</div>'
    );
  }).join("");
}
