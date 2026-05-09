// ClipList.js - Sidebar clip list with thumbnails and live progress bars

function renderClipList() {
  var el = document.getElementById("tab-clips");
  el.innerHTML = CLIPS.map(function(c, i) {
    return '<div class="clip-item' + (i === state.clipIdx ? " active" : "") + '" onclick="selectClip(' + i + ')">'
      + '<div class="clip-thumb-wrap">'
      +   '<canvas id="clipThumb' + i + '" width="48" height="32"></canvas>'
      +   '<div class="clip-dur">' + c.dur + '</div>'
      + '</div>'
      + '<div class="clip-meta">'
      +   '<div class="clip-title">' + c.title + '</div>'
      +   '<div class="clip-sub">'  + c.startTime + ' - ' + c.road + '</div>'
      +   '<div class="clip-progress-bar"><div class="clip-progress-fill" id="clipBar' + i + '" style="width:' + clipProgressPct(i) + '%"></div></div>'
      + '</div>'
      + '<span class="clip-badge ' + (c.type === "event" ? "evt" : "norm") + '">' + (c.type === "event" ? "EVT" : "OK") + '</span>'
      + '</div>';
  }).join("");

  // Draw thumbnails after inserting into DOM
  CLIPS.forEach(function(c, i) { drawThumb(i, c); });
}

function drawThumb(i, clip) {
  var c = document.getElementById("clipThumb" + i);
  if (!c) return;
  var cx = c.getContext("2d"), w = 48, h = 32;
  cx.fillStyle = "#1a1e28"; cx.fillRect(0, 0, w, h);
  cx.fillStyle = "#0d1520"; cx.fillRect(0, 0, w, h * 0.4);
  cx.fillStyle = "#1c2030"; cx.fillRect(0, h * 0.4, w, h * 0.6);
  cx.strokeStyle = "rgba(255,220,0,0.5)"; cx.lineWidth = 1; cx.setLineDash([3, 3]);
  cx.beginPath(); cx.moveTo(w / 2, h * 0.42); cx.lineTo(w / 2, h); cx.stroke();
  cx.setLineDash([]);
  if (clip.type === "event") {
    cx.fillStyle = "rgba(239,68,68,0.25)"; cx.fillRect(0, 0, w, h);
    cx.strokeStyle = "rgba(239,68,68,0.5)"; cx.lineWidth = 1; cx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }
  cx.fillStyle = "rgba(0,212,255,0.7)";
  cx.font = "bold 6px monospace";
  cx.fillText(clip.startTime, 2, h - 3);
}

function updateClipBars() {
  for (var i = 0; i < CLIPS.length; i++) {
    var bar = document.getElementById("clipBar" + i);
    if (bar) bar.style.width = clipProgressPct(i) + "%";
  }
}
