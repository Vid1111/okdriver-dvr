import {
  appState,
  setState
} from "../store/appState.js";

import {
  clipEnded
} from "./PlaybackController.js";

var video = document.getElementById("videoPlayer");

var currentUrl = null;

function attachListeners() {

  if (!video) return;

  video.onended = function () {

    console.log("VIDEO ENDED");

    clipEnded();
  };

  video.onerror = function (e) {

    console.error("VIDEO ERROR:", e);

    setState({
      playerState: "error",
      statusMsg: "Video playback failed."
    });
  };

  video.onwaiting = function () {

    console.log("BUFFERING...");

    setState({
      playerState: "loading",
      statusMsg: "Buffering video..."
    });
  };

  video.onplaying = function () {

    console.log("PLAYING");

    setState({
      playerState: "playing",
      statusMsg: ""
    });
  };
}

attachListeners();

export function loadClip(url, timestamp, offsetSeconds) {

  if (!video) {
    video = document.getElementById("videoPlayer");
    attachListeners();
  }

  if (!video) return;

  /*
    HUGE FIX:

    Prevent reloading SAME video again.
    Reloading same src flushes browser buffer
    causing 20s chunk buffering.
  */
  if (currentUrl === url) {

    console.log("SAME VIDEO ALREADY LOADED");

    if (offsetSeconds > 0) {

      try {
        video.currentTime = offsetSeconds;
      } catch (e) {
        console.error(e);
      }
    }

    video.play();

    return;
  }

  currentUrl = url;

  console.log("LOADING VIDEO:", url);

  setState({
    playerState: "loading",
    statusMsg: "Loading video..."
  });

  /*
    Reset player safely
  */
  video.pause();

  video.removeAttribute("src");
  video.load();

  /*
    Better streaming support
  */
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  /*
    IMPORTANT:
    Set src only once
  */
  video.src = url;

  /*
    Wait for metadata before seeking
  */
  video.onloadedmetadata = function () {

    console.log("METADATA LOADED");

    if (offsetSeconds > 0) {

      try {

        video.currentTime = offsetSeconds;

      } catch (e) {

        console.error("SEEK FAILED:", e);
      }
    }
  };

  /*
    CRITICAL FIX:

    canplaythrough waits for enough buffering
    instead of tiny chunk playback.
  */
  video.oncanplaythrough = function () {

    console.log("CAN PLAY THROUGH");

    video.play()

      .then(function () {

        setState({
          playerState: "playing",
          statusMsg: ""
        });

      })

      .catch(function (e) {

        console.error("PLAY FAILED:", e);

        setState({
          playerState: "error",
          statusMsg: "Playback failed."
        });
      });
  };
}

export function playVideo() {

  if (!video) return;

  video.play()

    .then(function () {

      setState({
        playerState: "playing"
      });

    })

    .catch(function (e) {

      console.error(e);
    });
}

export function pauseVideo() {

  if (!video) return;

  video.pause();

  setState({
    playerState: "paused"
  });
}

export function stopVideo() {

  if (!video) return;

  video.pause();

  video.removeAttribute("src");

  video.load();

  currentUrl = null;

  setState({
    playerState: "idle"
  });
}