// TelemetryPanel.js - Sparkline charts and session event jump list

function drawSparkline(id, data, color, min, max) {
  var c = document.getElementById(id);
  if (!c) return;
  var cx = c.getContext("2d");
  var w  = c.clientWidth || 220;
  var h  = 44;
  c.width = w;
  cx.clearRect(0, 0, w, h);
  cx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var x = (i / (data.length - 1)) * w;
    var y = h - ((data[i] - min) / (max - min)) * h * 0.9 - 2;
    i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
  }
  cx.strokeStyle = color;
  cx.lineWidth   = 1.5;
  cx.stroke();
  // Area fill
  cx.lineTo(w, h); cx.lineTo(0, h); cx.closePath();
  cx.fillStyle = color + "28";
  cx.fill();
}

function renderSparklines() {
  drawSparkline("speedChart",  state.speedHistory,  "#00d4ff", 0, 100);
  drawSparkline("gforceChart", state.gforceHistory, "#f59e0b", 0, 1);
}

function renderEventList() {
  var el = document.getElementById("eventList");
  el.innerHTML = SESSION_EVENTS.map(function(ev) {
    return '<div class="ev-item" onclick="selectClip(' + ev.clipIdx + ')">'
      + '<div class="ev-dot ' + ev.sev + '"></div>'
      + '<div class="ev-label">' + ev.label + '</div>'
      + '<div class="ev-time">'  + ev.time  + '</div>'
      + '</div>';
  }).join("");
}
