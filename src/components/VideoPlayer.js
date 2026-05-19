var videoEl = null;
var endedCb = null;
var timeCb = null;
var rafId = null;
var clipBaseMs = 0;

function initPlayer(el, onEnded, onTimeUpdate) {
  videoEl = el;
  endedCb = onEnded || function () {};
  timeCb = onTimeUpdate || function () {};

  videoEl.addEventListener("ended", function () {
    stopRaf();
    endedCb();
  });

  videoEl.addEventListener("waiting", function () {
    setState({
      playerState: "buffering",
      statusMsg: "Buffering..."
    });
  });

  videoEl.addEventListener("playing", function () {
    setState({
      playerState: "playing",
      statusMsg: ""
    });

    startRaf();
  });

  videoEl.addEventListener("pause", function () {
    if (appState.playerState === "playing") {
      setState({
        playerState: "paused"
      });
    }
  });

  videoEl.addEventListener("error", function (e) {
    console.error(
      "VIDEO ERROR:",
      e
    );

    console.error(
      "VIDEO ELEMENT ERROR:",
      videoEl.error
    );

    setState({
      playerState: "error",
      statusMsg: "Clip failed to load."
    });
  });
}

function loadClip(
  url,
  clipStartMs,
  offsetSec
) {
  clipBaseMs = clipStartMs || 0;
  offsetSec = offsetSec || 0;

  console.log(
    "LOADING VIDEO:",
    url
  );

  setState({
    playerState: "loading",
    statusMsg: "Loading clip...",
    currentUrl: url
  });

  // IMPORTANT:
  // raw TS playback
  // no HLS.js

  videoEl.pause();

  videoEl.removeAttribute("src");

  videoEl.load();

  videoEl.src = url;

  videoEl.currentTime =
    offsetSec;

  var playPromise =
    videoEl.play();

  if (playPromise) {
    playPromise.catch(function (err) {
      console.error(
        "PLAY FAILED:",
        err
      );

      setState({
        playerState: "error",
        statusMsg: "Could not play clip."
      });
    });
  }
}

function playVideo() {
  if (!videoEl) return;

  videoEl.play().catch(
    function () {}
  );
}

function pauseVideo() {
  if (!videoEl) return;

  videoEl.pause();
}

function toggleVideo() {
  if (!videoEl) return;

  if (videoEl.paused) {
    playVideo();
  } else {
    pauseVideo();
  }
}

function setRate(r) {
  if (videoEl) {
    videoEl.playbackRate = r;
  }
}

function startRaf() {
  stopRaf();

  function tick() {
    if (
      videoEl &&
      !videoEl.paused &&
      !videoEl.ended
    ) {
      var ms =
        clipBaseMs +
        videoEl.currentTime * 1000;

      setState({
        cursorMs: ms
      });

      moveScrubber(ms);

      timeCb(ms);
    }

    rafId =
      requestAnimationFrame(
        tick
      );
  }

  rafId =
    requestAnimationFrame(
      tick
    );
}

function stopRaf() {
  if (rafId) {
    cancelAnimationFrame(
      rafId
    );

    rafId = null;
  }
}