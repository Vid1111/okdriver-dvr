// main.js - App entry point: animation loop + sidebar tabs

var lastTs = 0;

function loop(ts) {
  if (state.playing) {
    var dt = ts - lastTs;
    // Advance progress: 45-min session across full timeline
    state.progress += (dt / 1000) * state.speed * (1 / (45 * 60));
    if (state.progress >= 1) state.progress = 0;

    // Auto-select clip based on current position
    var ci = 0;
    for (var i = 0; i < CLIP_POS.length; i++) {
      if (state.progress >= CLIP_POS[i]) ci = i;
    }
    if (ci !== state.clipIdx) {
      state.clipIdx = ci;
      renderClipList();
      updateClipIndicator();
    }
    updateTimeline();
    updateClipBars();
    drawMap();
  }
  lastTs = ts;
  drawMain(ts);
  renderSparklines();
  requestAnimationFrame(loop);
}

// Sidebar tab switching
document.querySelectorAll(".stab").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var tab = btn.dataset.tab;
    document.querySelectorAll(".stab").forEach(function(b) { b.classList.remove("active"); });
    btn.classList.add("active");
    document.getElementById("tab-clips").style.display     = tab === "clips"     ? "block" : "none";
    document.getElementById("tab-telemetry").style.display = tab === "telemetry" ? "block" : "none";
    document.getElementById("tab-map").style.display       = tab === "map"       ? "block" : "none";
    if (tab === "map") drawMap();
  });
});

// Boot
renderClipList();
renderEventList();
drawMap();
lastTs = performance.now();
requestAnimationFrame(loop);
