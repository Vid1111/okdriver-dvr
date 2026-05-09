// DVRPlayer.js - Canvas-based dashcam video renderer with HUD overlay

var canvas = document.getElementById("mainCanvas");
var ctx    = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width  = canvas.parentElement.clientWidth  || 640;
  canvas.height = canvas.parentElement.clientHeight || 360;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawMain(ts) {
  var w    = canvas.width;
  var h    = canvas.height;
  var clip = CLIPS[state.clipIdx];
  var t    = ts * 0.001;

  // Sky gradient
  var sg = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sg.addColorStop(0, "#0a1628");
  sg.addColorStop(1, "#1a3050");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w, h * 0.55);

  // Road gradient
  var rg = ctx.createLinearGradient(0, h * 0.52, 0, h);
  rg.addColorStop(0, "#1c2030");
  rg.addColorStop(1, "#0d1020");
  ctx.fillStyle = rg;
  ctx.fillRect(0, h * 0.52, w, h * 0.48);

  // Perspective road edges
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.52); ctx.lineTo(w * 0.05, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.52); ctx.lineTo(w * 0.95, h); ctx.stroke();

  // Animated lane markers
  var laneOff = (t * clip.avgSpeed * 0.003 * state.speed) % 1;
  ctx.strokeStyle    = "rgba(255,220,0,0.7)";
  ctx.lineWidth      = 3;
  ctx.setLineDash([30, 30]);
  ctx.lineDashOffset = -laneOff * 60;
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.52); ctx.lineTo(w * 0.5, h); ctx.stroke();
  ctx.setLineDash([]);

  // Scrolling buildings
  for (var b = 0; b < 8; b++) {
    var bx   = ((b * 137 + t * 20 * state.speed) % (w + 50)) - 25;
    var side = b % 2 === 0 ? bx * 0.15 + w * 0.05 : w - bx * 0.15 - w * 0.05;
    ctx.fillStyle = "#0d1520";
    ctx.fillRect(side, h * 0.35, 20 + (b % 3) * 8, h * 0.17 + (b % 2) * 10);
    ctx.fillStyle = "rgba(255,220,100,0.4)";
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 2; c++) {
        if ((b + r + c) % 3 !== 0) ctx.fillRect(side + 4 + c * 8, h * 0.37 + r * 8, 5, 4);
      }
    }
  }

  // Event vignette overlay
  if (clip.event) {
    if (clip.event.sev === "danger") {
      ctx.fillStyle = "rgba(239,68,68," + (0.06 + Math.sin(t * 8) * 0.03) + ")";
      ctx.fillRect(0, 0, w, h);
      var dv = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.8);
      dv.addColorStop(0, "transparent");
      dv.addColorStop(1, "rgba(239,68,68,0.3)");
      ctx.fillStyle = dv;
      ctx.fillRect(0, 0, w, h);
    } else {
      var wv = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.8);
      wv.addColorStop(0, "transparent");
      wv.addColorStop(1, "rgba(245,158,11,0.22)");
      ctx.fillStyle = wv;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Scan lines
  for (var y = 0; y < h; y += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, y, w, 1);
  }

  // Vignette
  var vg = ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h*0.9);
  vg.addColorStop(0, "transparent");
  vg.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Update HUD elements
  var liveSpeed = Math.round(clip.avgSpeed + Math.sin(t * 2) * 6);
  document.getElementById("hudSpeed").textContent = liveSpeed;
  document.getElementById("hudGps").textContent   = clip.gps.lat.toFixed(4) + " N, " + clip.gps.lng.toFixed(4) + " E";
  document.getElementById("hudRoad").textContent  = clip.road;

  var tc = progressToTimecode(state.progress);
  document.getElementById("hudTime").textContent    = tc;
  document.getElementById("tlTimecode").textContent = tc;
  document.getElementById("durDisplay").textContent = tc + " / 08:23:00";

  // Event pill
  var pill = document.getElementById("eventPill");
  if (clip.event) {
    pill.innerHTML = '<div class="event-pill ' + clip.event.sev + '">' + clip.event.label + '</div>';
  } else {
    pill.innerHTML = "";
  }

  // Live telemetry values
  var gf = Math.abs(Math.sin(t * 1.5) * 0.6).toFixed(2);
  document.getElementById("tSpeed").textContent   = liveSpeed;
  document.getElementById("tGforce").textContent  = gf;
  document.getElementById("tRpm").textContent     = Math.round(800 + liveSpeed * 28 + Math.sin(t) * 100).toLocaleString();
  document.getElementById("tHeading").textContent = HEADINGS[Math.floor(t * 0.5) % 16];

  // Push new telemetry samples
  state.speedHistory.push(liveSpeed);
  state.gforceHistory.push(parseFloat(gf));
  if (state.speedHistory.length  > 40) state.speedHistory.shift();
  if (state.gforceHistory.length > 40) state.gforceHistory.shift();
}
