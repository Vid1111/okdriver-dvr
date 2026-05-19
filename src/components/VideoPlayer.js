var videoEl    = null;
var hlsPlayer  = null;
var endedCb    = null;
var timeCb     = null;
var rafId      = null;
var clipBaseMs = 0;

function initPlayer(el, onEnded, onTimeUpdate) {
  videoEl  = el;
  endedCb  = onEnded      || function() {};
  timeCb   = onTimeUpdate || function() {};

  videoEl.addEventListener("ended", function() {
    stopRaf();
    endedCb();
  });

  videoEl.addEventListener("waiting", function() {
    setState({ playerState: "buffering", statusMsg: "Buffering..." });
  });

  videoEl.addEventListener("playing", function() {
    setState({ playerState: "playing", statusMsg: "" });
    startRaf();
  });

  videoEl.addEventListener("pause", function() {
    if (appState.playerState === "playing") setState({ playerState: "paused" });
  });

  videoEl.addEventListener("error", function() {
    setState({ playerState: "error", statusMsg: "Could not load video." });
  });
}

function loadClip(url, clipStartMs, offsetSec) {
  clipBaseMs = clipStartMs || 0;
  offsetSec  = offsetSec  || 0;

  setState({ playerState: "loading", statusMsg: "Loading clip...", currentUrl: url });

  if (hlsPlayer) { hlsPlayer.destroy(); hlsPlayer = null; }

  if (typeof Hls !== "undefined" && Hls.isSupported()) {
    hlsPlayer = new Hls({ enableWorker: true });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(videoEl);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
      videoEl.currentTime = offsetSec;
      videoEl.play().catch(function() {});
    });
    hlsPlayer.on(Hls.Events.ERROR, function(e, data) {
      if (data.fatal) setState({ playerState: "error", statusMsg: "Clip failed to load." });
    });
  } else {
    // fallback for Safari which supports HLS natively
    videoEl.src = url;
    videoEl.currentTime = offsetSec;
    videoEl.play().catch(function() {});
  }
}

function playVideo()   { if (videoEl) videoEl.play().catch(function() {}); }
function pauseVideo()  { if (videoEl) videoEl.pause(); }
function toggleVideo() { if (!videoEl) return; videoEl.paused ? playVideo() : pauseVideo(); }
function setRate(r)    { if (videoEl) videoEl.playbackRate = r; }

function startRaf() {
  stopRaf();
  function tick() {
    if (videoEl && !videoEl.paused && !videoEl.ended) {
      var ms = clipBaseMs + videoEl.currentTime * 1000;
      setState({ cursorMs: ms });
      moveScrubber(ms);
      timeCb(ms);
    }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
}

function stopRaf() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}
