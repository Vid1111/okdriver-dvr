// Timeline.js - Clickable 24-hour timeline with event markers and scrubbing

var timelineTrack = document.getElementById("timelineTrack");

function updateTimeline() {
  document.getElementById("tlFill").style.width  = (state.progress * 100) + "%";
  document.getElementById("tlThumb").style.left  = (state.progress * 100) + "%";
}

function timelineSeek(e) {
  var rect = timelineTrack.getBoundingClientRect();
  var p    = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.progress = p;

  // Auto-select the matching clip
  var ci = 0;
  for (var i = 0; i < CLIP_POS.length; i++) {
    if (p >= CLIP_POS[i]) ci = i;
  }
  state.clipIdx = ci;
  renderClipList();
  updateClipIndicator();
  updateTimeline();
  drawMap();
}

timelineTrack.addEventListener("click", timelineSeek);
timelineTrack.addEventListener("mousemove", function(e) {
  if (e.buttons === 1) timelineSeek(e);
});
