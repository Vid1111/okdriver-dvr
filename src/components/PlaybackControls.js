// PlaybackControls.js - Transport buttons, speed selector, play/pause

function togglePlay() {
  state.playing = !state.playing;
  var btn = document.getElementById("btnPlay");
  btn.innerHTML = state.playing ? "&#9208;" : "&#9654;";
  btn.classList.toggle("active", state.playing);
  document.getElementById("pauseOverlay").style.display = state.playing ? "none" : "flex";
}

function setSpeed(s) {
  state.speed = s;
  document.querySelectorAll(".speed-btn").forEach(function(b) {
    b.classList.toggle("active", parseFloat(b.dataset.speed) === s);
  });
}

function seekRel(secs) {
  state.progress = Math.max(0, Math.min(1, state.progress + secs / (45 * 60)));
  updateTimeline();
}

// Button listeners
document.getElementById("videoWrapper").addEventListener("click", togglePlay);
document.getElementById("btnPlay").addEventListener("click", function(e) { e.stopPropagation(); togglePlay(); });
document.getElementById("btnPrev").addEventListener("click", function() { if (state.clipIdx > 0) selectClip(state.clipIdx - 1); });
document.getElementById("btnNext").addEventListener("click", function() { if (state.clipIdx < CLIPS.length - 1) selectClip(state.clipIdx + 1); });
document.getElementById("btnBack").addEventListener("click", function() { seekRel(-30); });
document.getElementById("btnFwd").addEventListener("click",  function() { seekRel(30);  });

document.querySelectorAll(".speed-btn").forEach(function(b) {
  b.addEventListener("click", function() { setSpeed(parseFloat(b.dataset.speed)); });
});
