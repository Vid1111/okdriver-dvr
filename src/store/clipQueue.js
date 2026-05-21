// clipQueue.js
// DVR-style clip queue with pre-fetching.
//
// The core problem this solves: the dashcam uploads clips asynchronously after
// we call API 3. If we wait until the current clip finishes to request the next
// one, the user sits staring at a loading screen for several seconds between clips.
//
// The solution is a queue that always stays a few clips ahead:
//   [current] [next] [buffered+1] [buffered+2]
//
// As soon as a clip starts playing, we immediately fire API 3 for the ones
// coming after it. By the time the current clip ends, the next one is usually
// already uploaded and ready to play instantly.

import {
  startClipPlayback,
  waitForClip
} from "../utils/api.js";

import {
  appState
} from "./appState.js";

// How many clips ahead to pre-request at any given time
var PRELOAD_COUNT = 3;

var clips      = [];   // the full ordered list of clips for this session
var currentIdx = -1;   // which index is currently playing
var queue      = [];   // array of queue entry objects (see addToQueue)

// Callbacks registered by PlaybackController
var onReady   = null;  // called when a clip finishes uploading and is playable
var onError   = null;  // called when a clip fails after all retries
var onAdvance = null;  // called when currentIdx moves forward

// initQueue()
// Call this once when the user picks a starting point (either via timeline click
// or clip list click). It sets the clip list and starts pre-fetching from startIdx.
export function initQueue(clipList, startIdx, readyCb, errorCb, advanceCb) {
  clips     = clipList;
  onReady   = readyCb   || function(){};
  onError   = errorCb   || function(){};
  onAdvance = advanceCb || function(){};

  seekQueue(startIdx);
}

// seekQueue()
// Moves the queue pointer to a new index without destroying already-fetched entries.
// This lets us jump around on the timeline without throwing away work we've already done.
export function seekQueue(idx) {
  currentIdx = idx;

  // Drop anything more than 2 positions behind us — no point keeping it
  queue = queue.filter(function(e) {
    return e.idx >= currentIdx - 2;
  });

  // Make sure current + next PRELOAD_COUNT clips are in the queue
  for (var i = currentIdx; i < Math.min(currentIdx + PRELOAD_COUNT + 1, clips.length); i++) {
    addToQueue(i);
  }

  if (onAdvance) onAdvance(currentIdx);
}

// advanceQueue()
// Called automatically when a clip ends. Moves to the next clip and
// kicks off pre-fetching for the one that just entered the lookahead window.
export function advanceQueue() {
  currentIdx++;

  console.log("ADVANCING TO CLIP:", currentIdx);

  if (currentIdx >= clips.length) return null;

  // Drop old entries behind us
  queue = queue.filter(function(e) { return e.idx >= currentIdx - 2; });

  // The clip that just entered our lookahead window — pre-fetch it now
  var next = currentIdx + PRELOAD_COUNT;
  if (next < clips.length) addToQueue(next);

  if (onAdvance) onAdvance(currentIdx);

  return getEntryByIdx(currentIdx) || null;
}

// getCurrentEntry() / getEntryByIdx()
// Simple getters for the queue entries.
export function getCurrentEntry() {
  return getEntryByIdx(currentIdx);
}

export function getEntryByIdx(idx) {
  return queue.find(function(e) { return e.idx === idx; }) || null;
}

// getQueueSnapshot()
// Returns the current + upcoming entries for display in the queue status bar.
export function getQueueSnapshot() {
  return queue
    .filter(function(e) { return e.idx >= currentIdx && e.idx <= currentIdx + PRELOAD_COUNT; })
    .slice(0, PRELOAD_COUNT + 1);
}

// resetQueue()
// Wipes everything. Called when the user picks a completely different clip
// or changes the camera/date — we don't want stale API 3 responses coming back
// and hijacking the new playback session.
export function resetQueue() {
  queue      = [];
  currentIdx = -1;
  clips      = [];
}

// addToQueue()
// Internal function that requests a clip and tracks its upload progress.
// Skips silently if the clip is already in the queue (prevents duplicate API 3 calls).
function addToQueue(idx) {
  // Don't re-request something we've already started
  if (queue.find(function(e) { return e.idx === idx; })) return;

  var clip = clips[idx];
  if (!clip) return;

  var entry = {
    idx:          idx,
    clip:         clip,
    status:       "requesting",  // requesting -> polling -> ready (or error)
    url:          null,
    retries:      0,
    pollProgress: null           // { tries, max } for the loading bar
  };

  queue.push(entry);

  // Keep the queue sorted by clip index so getQueueSnapshot() stays in order
  queue.sort(function(a, b) { return a.idx - b.idx; });

  console.log("PRE-FETCHING CLIP:", clip.filename);

  var imei = appState.imei;

  // Step 1: Call API 3 to tell the device to upload this clip
  startClipPlayback(clip.filename, imei)
    .then(function(res) {
      console.log("API 3 RESPONSE:", res);

      if (!res.success) {
        retryQueueEntry(entry);
        return;
      }

      // Step 2: Poll the ready endpoint until the clip is uploaded
      entry.status = "polling";

      waitForClip(
        clip.filename,
        imei,
        function(readyUrl) {
          console.log("CLIP READY:", clip.filename, readyUrl);
          entry.status = "ready";
          entry.url    = readyUrl;
          onReady(entry);
        },
        function() {
          retryQueueEntry(entry);
        },
        function(tries, max) {
          // Keep track of poll progress so the loading bar can show something useful
          entry.pollProgress = { tries: tries, max: max };
        }
      );
    })
    .catch(function(err) {
      console.error("QUEUE ENTRY ERROR:", err);
      retryQueueEntry(entry);
    });
}

// retryQueueEntry()
// If a clip request fails (API 3 error or upload timeout), retry up to 3 times
// with an 8-second delay between attempts before giving up and marking it as error.
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

  // Exhausted all retries
  entry.status = "error";
  console.log("CLIP FAILED PERMANENTLY:", entry.clip.filename);
  onError(entry);
}
