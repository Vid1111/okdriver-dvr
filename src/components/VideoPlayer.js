// VideoPlayer.js
// Thin wrapper around the HTML5 <video> element.
//
// I isolated all direct video DOM manipulation here so nothing else in the app
// touches the video element directly. That way if we ever swap out the player
// (e.g. add HLS.js support), we only change this file.

import {
  appState,
  setState
} from "../store/appState.js";

import {
  clipEnded
} from "./PlaybackController.js";

// Lazy reference — the element might not exist yet when this module loads
var video = document.getElementById("videoPlayer");

var currentUrl = null; // tracks what's loaded to avoid redundant src changes

function attachListeners() {
  if (!video) return;

  // When the clip finishes, tell PlaybackController to load the next one
  video.onended = function() {
    console.log("VIDEO ENDED");
    clipEnded();
  };

  // Surface video errors to the loading screen
  video.onerror = function(e) {
    console.error("VIDEO ERROR:", e);
    setState({
      playerState: "error",
      statusMsg: "Video playback failed. The clip may not have uploaded correctly."
    });
  };

  // Show buffering state when the browser is waiting for data
  video.onwaiting = function() {
    console.log("BUFFERING...");
    setState({
      playerState: "loading",
      statusMsg: "Buffering video..."
    });
  };

  // Clear loading state as soon as actual frames start rendering
  video.onplaying = function() {
    console.log("PLAYING");
    setState({
      playerState: "playing",
      statusMsg: ""
    });
  };
}

attachListeners();

// loadClip()
// Loads a new video URL and seeks to the given offset before playing.
// The offset handles the case where the user clicked partway through a clip —
// e.g. clicked 09:31:30 on the timeline but the clip starts at 09:30:00, so offset = 90s.
export function loadClip(url, timestamp, offsetSeconds) {

  // Try to get the element again in case it wasn't ready on module load
  if (!video) {
    video = document.getElementById("videoPlayer");
    attachListeners();
  }

  if (!video) return;

  // Don't reload the same URL — this would flush the browser's buffer and cause
  // a noticeable stall even if the clip was already fully buffered
  if (currentUrl === url) {
    console.log("CLIP ALREADY LOADED, seeking only");
    if (offsetSeconds > 0) {
      try { video.currentTime = offsetSeconds; } catch (e) { console.error(e); }
    }
    video.play();
    return;
  }

  currentUrl = url;
  console.log("LOADING NEW CLIP:", url);

  setState({
    playerState: "loading",
    statusMsg: "Loading video..."
  });

  // Reset the player cleanly before setting a new source
  video.pause();
  video.removeAttribute("src");
  video.load();

  // These help with CORS and streaming performance
  video.preload      = "auto";
  video.crossOrigin  = "anonymous";

  video.src = url;

  // Wait for metadata (duration, dimensions) before attempting to seek —
  // seeking before metadata loads throws a DOM exception in some browsers
  video.onloadedmetadata = function() {
    console.log("METADATA LOADED");
    if (offsetSeconds > 0) {
      try {
        video.currentTime = offsetSeconds;
      } catch (e) {
        console.error("SEEK FAILED:", e);
      }
    }
  };

  // canplaythrough = enough data is buffered to play without interruption.
  // I'm using this instead of canplay because canplay fires very early and
  // often leads to choppy playback on slow connections.
  video.oncanplaythrough = function() {
    console.log("CAN PLAY THROUGH");
    video.play()
      .then(function() {
        setState({
          playerState: "playing",
          statusMsg: ""
        });
      })
      .catch(function(e) {
        console.error("AUTOPLAY FAILED:", e);
        setState({
          playerState: "error",
          statusMsg: "Playback blocked. Click play to continue."
        });
      });
  };
}

// playVideo() / pauseVideo() / stopVideo()
// Simple controls exposed to the rest of the app.
export function playVideo() {
  if (!video) return;
  video.play()
    .then(function() { setState({ playerState: "playing" }); })
    .catch(function(e) { console.error(e); });
}

export function pauseVideo() {
  if (!video) return;
  video.pause();
  setState({ playerState: "paused" });
}

export function stopVideo() {
  if (!video) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
  currentUrl = null;
  setState({ playerState: "idle" });
}

// initPlayer()
// Called from main.js to connect the video element and wire up the onEnded
// and onTimeUpdate callbacks that the rest of the app needs.
export function initPlayer(el, onEndedCb, onTimeCb) {
  video = el;

  attachListeners();

  if (onEndedCb) {
    video.addEventListener("ended", onEndedCb);
  }

  // timeupdate fires roughly every 250ms while the video is playing.
  // We use it to move the timeline scrubber and update the HUD timestamp.
  if (onTimeCb) {
    video.addEventListener("timeupdate", function() {
      var clip = appState.activeClips[appState.currentIdx];
      if (!clip) return;
      // Convert video's current playback position back to a wall-clock timestamp
      var ms = clip.timestamp + video.currentTime * 1000;
      onTimeCb(ms);
    });
  }
}

// toggleVideo()
// Convenience toggle for the play/pause button in the controls bar.
export function toggleVideo() {
  if (!video) return;
  if (video.paused) {
    playVideo();
  } else {
    pauseVideo();
  }
}

// setRate()
// Changes playback speed (0.5x, 1x, 2x, 4x).
export function setRate(rate) {
  if (!video) return;
  video.playbackRate = rate;
}
