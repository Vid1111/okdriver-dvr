// PlaybackController.js
// The brain of the DVR playback system.
//
// This is the only file that coordinates between the three API calls,
// the clip queue, and the video player. Everything else is either a
// dumb renderer or a pure utility.
//
// Flow for a typical timeline click:
//   1. User clicks 09:30 on the timeline
//   2. seekToTime(timestampMs) is called here
//   3. We find which clip covers 09:30 using findClipAt()
//   4. We reset the queue and init it from that clip index
//   5. The queue fires API 3 for that clip + the next 3 clips
//   6. We poll until the clip is uploaded (waitForClip in api.js)
//   7. onClipReady() fires and calls loadClip() in VideoPlayer.js
//   8. Video plays from the correct offset within the clip
//   9. When the clip ends, clipEnded() triggers goToNextClip()

import {
  appState,
  setState
} from "../store/appState.js";

import {
  initQueue,
  advanceQueue,
  resetQueue
} from "../store/clipQueue.js";

import {
  findClipAt,
  seekOffset,
  buildTimeline
} from "../utils/clipUtils.js";

import {
  loadClip,
  playVideo,
  pauseVideo
} from "./VideoPlayer.js";

import {
  getVideoList,
  requestVideoList
} from "../utils/api.js";

import {
  renderTimeline
} from "./Timeline.js";

import {
  renderClipList
} from "./ClipList.js";

var queueInitialized    = false;
var currentlyPlayingUrl = null;

// wantedIdx tracks the LAST clip the user explicitly selected.
// This prevents a race condition where an older API 3 response comes back
// after the user has already jumped to a different clip and accidentally
// overrides the correct playback.
var wantedIdx = -1;

// seekToTime()
// Entry point for timeline clicks and clip list clicks.
// targetMs is a millisecond timestamp (from the timeline click position).
export function seekToTime(targetMs) {
  var tl = appState.timeline;
  if (!tl) return;

  var clips = getActiveClips();

  if (!clips.length) {
    setState({ statusMsg: "No clips available for the selected camera." });
    return;
  }

  // Find the clip that covers this timestamp
  var idx = findClipAt(clips, targetMs);

  if (idx === -1) {
    // Nothing at exactly that timestamp — find the next clip after it
    for (var i = 0; i < clips.length; i++) {
      if (clips[i].timestamp >= targetMs) {
        idx = i;
        break;
      }
    }
    // If still nothing found (clicked past the last clip), just start from the beginning
    if (idx === -1) idx = 0;
  }

  // How far into this clip should we start playing?
  var offset = seekOffset(clips[idx], targetMs);

  // Remember this as the clip we want
  wantedIdx = idx;

  // IMPORTANT: destroy any existing queue before creating a new one.
  // Without this, old in-flight API 3 requests can finish and call onClipReady()
  // with the wrong clip, overriding whatever the user just selected.
  resetQueue();

  queueInitialized    = true;
  currentlyPlayingUrl = null;

  setState({
    activeClips:  clips,
    currentIdx:   idx,
    startOffset:  offset,
    playerState:  "loading",
    statusMsg:    "Requesting clip from device..."
  });

  // Build a fresh queue starting at the clicked clip
  initQueue(
    clips,
    idx,
    onClipReady,
    onClipError,
    onQueueMove
  );

  renderClipList();
}

// onClipReady()
// Called by the queue when a clip has finished uploading and is ready to stream.
function onClipReady(entry) {

  // Ignore callbacks for clips the user has already navigated away from
  if (entry.idx !== wantedIdx) {
    console.log("IGNORING STALE READY:", entry.clip.filename);
    return;
  }

  // Don't reload if this URL is somehow already playing (shouldn't happen but defensive)
  if (currentlyPlayingUrl === entry.url) {
    return;
  }

  currentlyPlayingUrl = entry.url;

  loadClip(
    entry.url,
    entry.clip.timestamp,
    appState.startOffset
  );

  // Clear the start offset after using it — we only want to seek on the first load
  setState({
    startOffset: 0,
    statusMsg: ""
  });
}

// onClipError()
// Called when a clip fails all retries. Show an error state if it's the current clip.
function onClipError(entry) {
  console.error("CLIP FAILED:", entry.clip.filename);
  if (entry.idx === wantedIdx) {
    setState({
      playerState: "error",
      statusMsg: "Could not load clip " + entry.clip.displayTime + ". Device may be offline."
    });
  }
}

// onQueueMove()
// Called whenever the queue's current index changes (including on auto-advance).
function onQueueMove(newIdx) {
  setState({ currentIdx: newIdx });
  renderClipList();
}

// clipEnded()
// Called by VideoPlayer when the HTML5 video 'ended' event fires.
// Exported because VideoPlayer.js calls it directly.
export function clipEnded() {
  goToNextClip();
}

// goToNextClip()
// Advances to the next clip in the queue. If the next clip is already pre-fetched
// and ready, playback is nearly instant. If not, we show a loading state and
// wait for the queue's onClipReady callback to fire.
function goToNextClip() {
  currentlyPlayingUrl = null;

  var next = advanceQueue();

  if (!next) {
    setState({
      playerState: "idle",
      statusMsg: "End of available recordings."
    });
    return;
  }

  // The auto-advanced clip becomes the new "wanted" clip
  wantedIdx = next.idx;

  if (next.status === "ready") {
    // Best case: clip was pre-fetched and is ready immediately
    currentlyPlayingUrl = next.url;
    loadClip(next.url, next.clip.timestamp, 0);
  } else {
    // Still uploading — show loading state.
    // onClipReady() will fire and call loadClip() when it's done.
    setState({
      playerState: "loading",
      statusMsg: "Loading next clip (" + next.clip.displayTime + ")..."
    });
  }
}

// loadVideoList()
// Called when the user clicks Search. Runs the full API 1 → API 2 pipeline
// and renders the timeline and clip list when data is ready.
export function loadVideoList(forceRefresh) {

  // Reset all playback state for the new search
  queueInitialized    = false;
  currentlyPlayingUrl = null;
  wantedIdx           = -1;

  resetQueue();

  setState({
    statusMsg:      "Fetching video list...",
    videoListReady: false
  });

  function fetchVideos(retry) {
    retry = retry || 0;

    getVideoList(appState.imei)
      .then(function(res) {
        console.log("VIDEO LIST RESPONSE:", res);

        if (!res.success || !res.videos) {
          setState({ statusMsg: "Could not load clips from server." });
          return;
        }

        if (!res.videos.length) {
          // Device might still be scanning — retry a few times before giving up
          if (retry < 20) {
            setState({
              statusMsg: "Waiting for device to report clips... (" + retry + "/20)"
            });
            setTimeout(function() { fetchVideos(retry + 1); }, 3000);
            return;
          }
          setState({ statusMsg: "No videos found for this date. Try a different date." });
          return;
        }

        // Parse all the filenames into timeline data
        var tl = buildTimeline(res.videos);

        setState({
          rawFiles:       res.videos,
          timeline:       tl,
          videoListReady: true,
          statusMsg:      res.videos.length + " clips loaded. Click the timeline or a clip to play."
        });

        renderTimeline(tl);
        renderClipList();
      })
      .catch(function(e) {
        console.error("VIDEO LIST ERROR:", e);
        setState({ statusMsg: "Failed to load video list. Check your connection." });
      });
  }

  if (forceRefresh) {
    // API 1: wake the device and tell it to scan
    setState({ statusMsg: "Requesting clip list from device..." });
    requestVideoList(appState.imei, 30)
      .then(function() {
        // Small delay to give the device a moment to process before we poll
        fetchVideos(0);
      })
      .catch(function(e) {
        console.error("REQUEST LIST ERROR:", e);
        // Fall through to polling anyway — device might already have data
        fetchVideos(0);
      });
  } else {
    fetchVideos(0);
  }
}

// getActiveClips()
// Returns the correct clip list based on the currently selected camera.
export function getActiveClips() {
  var tl = appState.timeline;
  if (!tl) return [];
  return appState.camera === "Inward" ? tl.inClips : tl.fwdClips;
}

// Thin wrappers for the controls bar buttons
export function resumePlayback() { playVideo(); }
export function pausePlayback()  { pauseVideo(); }

export function nextClip() {
  goToNextClip();
}

export function previousClip() {
  var idx   = appState.currentIdx - 1;
  var clips = getActiveClips();
  if (idx < 0) idx = 0;
  if (!clips[idx]) return;
  seekToTime(clips[idx].timestamp);
}
