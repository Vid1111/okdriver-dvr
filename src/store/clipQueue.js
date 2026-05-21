import {
  startClipPlayback,
  waitForClip
} from "../utils/api.js";

import {
  appState
} from "./appState.js";

var PRELOAD_COUNT = 3;

var clips      = [];
var currentIdx = -1;
var queue      = [];

var onReady   = null;
var onError   = null;
var onAdvance = null;

// --------------------------------------------------
// INIT (first time only — sets clips list and callbacks)
// --------------------------------------------------
export function initQueue(clipList, startIdx, readyCb, errorCb, advanceCb) {
  clips     = clipList;
  onReady   = readyCb   || function(){};
  onError   = errorCb   || function(){};
  onAdvance = advanceCb || function(){};

  // Don't wipe the queue — call seekQueue to move pointer
  seekQueue(startIdx);
}

// --------------------------------------------------
// SEEK — move currentIdx to any position, keeping ready entries
// --------------------------------------------------
export function seekQueue(idx) {
  currentIdx = idx;

  // Drop entries that are far behind (more than 2 behind current)
  queue = queue.filter(function(e) {
    return e.idx >= currentIdx - 2;
  });

  // Ensure current + next PRELOAD_COUNT clips are in queue
  for (var i = currentIdx; i < Math.min(currentIdx + PRELOAD_COUNT + 1, clips.length); i++) {
    addToQueue(i);
  }

  if (onAdvance) onAdvance(currentIdx);
}

// --------------------------------------------------
// ADVANCE (auto-play next)
// --------------------------------------------------
export function advanceQueue() {
  currentIdx++;

  console.log("ADVANCING TO:", currentIdx);

  if (currentIdx >= clips.length) return null;

  // Drop old entries
  queue = queue.filter(function(e) { return e.idx >= currentIdx - 2; });

  // Preload next
  var next = currentIdx + PRELOAD_COUNT;
  if (next < clips.length) addToQueue(next);

  if (onAdvance) onAdvance(currentIdx);

  return getEntryByIdx(currentIdx) || null;
}

// --------------------------------------------------
// GETTERS
// --------------------------------------------------
export function getCurrentEntry() {
  return getEntryByIdx(currentIdx);
}

export function getEntryByIdx(idx) {
  return queue.find(function(e) { return e.idx === idx; }) || null;
}

export function getQueueSnapshot() {
  // Return entries around currentIdx for the queue bar display
  return queue
    .filter(function(e) { return e.idx >= currentIdx && e.idx <= currentIdx + PRELOAD_COUNT; })
    .slice(0, PRELOAD_COUNT + 1);
}

export function resetQueue() {
  queue      = [];
  currentIdx = -1;
  clips      = [];
}

// --------------------------------------------------
// ADD TO QUEUE (skip if already there)
// --------------------------------------------------
function addToQueue(idx) {
  // Already in queue (any status) — don't re-request
  if (queue.find(function(e) { return e.idx === idx; })) return;

  var clip = clips[idx];
  if (!clip) return;

  var entry = {
    idx:          idx,
    clip:         clip,
    status:       "requesting",
    url:          null,
    retries:      0,
    pollProgress: null
  };

  queue.push(entry);
  queue.sort(function(a, b) { return a.idx - b.idx; });

  console.log("REQUESTING:", clip.filename);

  var imei = appState.imei;

  startClipPlayback(clip.filename, imei)
    .then(function(res) {
      console.log("START RESPONSE:", res);

      if (!res.success) {
        retryQueueEntry(entry);
        return;
      }

      entry.status = "polling";

      waitForClip(
        clip.filename,
        imei,
        function(readyUrl) {
          console.log("READY:", readyUrl);
          entry.status = "ready";
          entry.url    = readyUrl;
          onReady(entry);
        },
        function() {
          retryQueueEntry(entry);
        },
        function(tries, max) {
          entry.pollProgress = { tries: tries, max: max };
        }
      );
    })
    .catch(function(err) {
      console.error("QUEUE ERROR:", err);
      retryQueueEntry(entry);
    });
}

// --------------------------------------------------
// RETRY
// --------------------------------------------------
function retryQueueEntry(entry) {
  entry.retries++;

  if (entry.retries < 3) {
    entry.status = "polling";

    var imei = appState.imei;

    setTimeout(function() {
      startClipPlayback(entry.clip.filename, imei)
        .then(function() {
          waitForClip(
            entry.clip.filename,
            imei,
            function(readyUrl) {
              entry.status = "ready";
              entry.url    = readyUrl;
              onReady(entry);
            },
            function() { retryQueueEntry(entry); },
            null
          );
        })
        .catch(function() { retryQueueEntry(entry); });
    }, 8000);

    return;
  }

  entry.status = "error";
  console.log("FINAL ERROR:", entry.clip.filename);
  onError(entry);
}