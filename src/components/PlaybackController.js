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

var queueInitialized = false;
var currentlyPlayingUrl = null;

/*
  Tracks the LAST clip user selected.
  Prevents async queue races.
*/
var wantedIdx = -1;

export function seekToTime(targetMs) {

  var tl = appState.timeline;
  if (!tl) return;

  var clips = getActiveClips();

  if (!clips.length) {

    setState({
      statusMsg: "No clips for selected camera."
    });

    return;
  }

  var idx = findClipAt(clips, targetMs);

  if (idx === -1) {

    for (var i = 0; i < clips.length; i++) {

      if (clips[i].timestamp >= targetMs) {
        idx = i;
        break;
      }
    }

    if (idx === -1) idx = 0;
  }

  var offset = seekOffset(clips[idx], targetMs);

  /*
    IMPORTANT:
    Remember actual selected clip
  */
  wantedIdx = idx;

  /*
    CRITICAL FIX:
    Destroy old queue completely.

    Old requests were still finishing
    and hijacking playback.
  */
  resetQueue();

  queueInitialized = true;
  currentlyPlayingUrl = null;

  setState({
    activeClips: clips,
    currentIdx: idx,
    startOffset: offset,
    playerState: "loading",
    statusMsg: "Loading selected clip..."
  });

  /*
    Rebuild queue from selected clip
  */
  initQueue(
    clips,
    idx,
    onClipReady,
    onClipError,
    onQueueMove
  );

  renderClipList();
}

function onClipReady(entry) {

  /*
    Only play the MOST RECENTLY selected clip.
  */
  if (entry.idx !== wantedIdx) {
    return;
  }

  if (currentlyPlayingUrl === entry.url) {
    return;
  }

  currentlyPlayingUrl = entry.url;

  loadClip(
    entry.url,
    entry.clip.timestamp,
    appState.startOffset
  );

  setState({
    startOffset: 0,
    statusMsg: ""
  });
}

function onClipError(entry) {

  console.error("CLIP FAILED:", entry);

  if (entry.idx === wantedIdx) {

    setState({
      playerState: "error",
      statusMsg: "Clip failed."
    });
  }
}

function onQueueMove(newIdx) {

  setState({
    currentIdx: newIdx
  });

  renderClipList();
}

export function clipEnded() {
  goToNextClip();
}

function goToNextClip() {

  currentlyPlayingUrl = null;

  var next = advanceQueue();

  if (!next) {

    setState({
      playerState: "idle",
      statusMsg: "No more clips."
    });

    return;
  }

  /*
    Auto-next becomes current wanted clip
  */
  wantedIdx = next.idx;

  if (next.status === "ready") {

    currentlyPlayingUrl = next.url;

    loadClip(
      next.url,
      next.clip.timestamp,
      0
    );

  } else {

    setState({
      playerState: "loading",
      statusMsg:
        "Loading next clip... (" +
        next.clip.displayTime +
        ")"
    });
  }
}

export function loadVideoList(forceRefresh) {

  /*
    Reset everything on new search
  */
  queueInitialized = false;
  currentlyPlayingUrl = null;
  wantedIdx = -1;

  resetQueue();

  setState({
    statusMsg: "Fetching video list...",
    videoListReady: false
  });

  function fetchVideos(retry) {

    retry = retry || 0;

    getVideoList(appState.imei)

      .then(function(res) {

        console.log("VIDEO LIST:", res);

        if (!res.success || !res.videos) {

          setState({
            statusMsg: "Could not load clips."
          });

          return;
        }

        if (!res.videos.length) {

          if (retry < 20) {

            setState({
              statusMsg:
                "Waiting for device clips... (" +
                retry +
                ")"
            });

            setTimeout(function() {
              fetchVideos(retry + 1);
            }, 3000);

            return;
          }

          setState({
            statusMsg: "No videos found."
          });

          return;
        }

        var tl = buildTimeline(res.videos);

        setState({
          rawFiles: res.videos,
          timeline: tl,
          videoListReady: true,
          statusMsg: res.videos.length + " clips loaded."
        });

        renderTimeline(tl);
        renderClipList();
      })

      .catch(function(e) {

        console.error(e);

        setState({
          statusMsg: "Video list failed."
        });

      });
  }

  if (forceRefresh) {

    setState({
      statusMsg: "Requesting clips from device..."
    });

    requestVideoList(appState.imei, 30)

      .then(function() {
        fetchVideos(0);
      })

      .catch(function(e) {

        console.error(e);

        fetchVideos(0);
      });

  } else {

    fetchVideos(0);
  }
}

export function getActiveClips() {

  var tl = appState.timeline;

  if (!tl) return [];

  return appState.camera === "Inward"
    ? tl.inClips
    : tl.fwdClips;
}

export function resumePlayback() {
  playVideo();
}

export function pausePlayback() {
  pauseVideo();
}

export function nextClip() {
  goToNextClip();
}

export function previousClip() {

  var idx = appState.currentIdx - 1;

  if (idx < 0) idx = 0;

  var clips = getActiveClips();

  if (!clips[idx]) return;

  seekToTime(clips[idx].timestamp);
}