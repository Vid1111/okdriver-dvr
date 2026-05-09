// MapPanel.js - Canvas route map with live position cursor

function drawMap() {
  var c = document.getElementById("mapCanvas");
  if (!c) return;
  var cx = c.getContext("2d");
  var w  = c.clientWidth || 236;
  var h  = 180;
  c.width = w; c.height = h;

  // Background
  cx.fillStyle = "#0d1520"; cx.fillRect(0, 0, w, h);

  // Grid
  cx.strokeStyle = "rgba(255,255,255,0.04)"; cx.lineWidth = 1;
  for (var x = 0; x < w; x += 20) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke(); }
  for (var y = 0; y < h; y += 20) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke(); }

  // Background roads
  cx.strokeStyle = "rgba(255,255,255,0.1)"; cx.lineWidth = 6;
  cx.beginPath(); cx.moveTo(0, h * 0.5); cx.lineTo(w, h * 0.5); cx.stroke();
  cx.beginPath(); cx.moveTo(w * 0.5, 0); cx.lineTo(w * 0.5, h); cx.stroke();

  // Route shadow
  cx.strokeStyle = "rgba(0,212,255,0.15)"; cx.lineWidth = 6;
  cx.beginPath();
  for (var i = 0; i < ROUTE.length; i++) {
    var p = ROUTE[i];
    i === 0 ? cx.moveTo(p[0]*w, p[1]*h) : cx.lineTo(p[0]*w, p[1]*h);
  }
  cx.stroke();

  // Route line
  cx.strokeStyle = "#00d4ff"; cx.lineWidth = 2.5;
  cx.beginPath();
  for (var i = 0; i < ROUTE.length; i++) {
    var p = ROUTE[i];
    i === 0 ? cx.moveTo(p[0]*w, p[1]*h) : cx.lineTo(p[0]*w, p[1]*h);
  }
  cx.stroke();

  // Direction arrows
  for (var i = 0; i < ROUTE.length - 1; i++) {
    var p1 = ROUTE[i], p2 = ROUTE[i+1];
    var mx = lerp(p1[0], p2[0], 0.5) * w;
    var my = lerp(p1[1], p2[1], 0.5) * h;
    var angle = Math.atan2((p2[1]-p1[1])*h, (p2[0]-p1[0])*w);
    cx.save(); cx.translate(mx, my); cx.rotate(angle);
    cx.fillStyle = "rgba(0,212,255,0.5)";
    cx.beginPath(); cx.moveTo(4,0); cx.lineTo(-3,-3); cx.lineTo(-3,3); cx.closePath(); cx.fill();
    cx.restore();
  }

  // Event pins on route
  [[2,"#ef4444"],[3,"#f59e0b"],[5,"#ef4444"]].forEach(function(ev) {
    var p = ROUTE[ev[0]], col = ev[1];
    cx.beginPath(); cx.arc(p[0]*w, p[1]*h, 6, 0, Math.PI*2);
    cx.fillStyle = col + "40"; cx.fill();
    cx.beginPath(); cx.arc(p[0]*w, p[1]*h, 4, 0, Math.PI*2);
    cx.fillStyle = col; cx.fill();
    cx.strokeStyle = "#fff"; cx.lineWidth = 1; cx.stroke();
  });

  // Live position cursor
  var rp = Math.min(state.progress, 0.99) * (ROUTE.length - 1);
  var ri = Math.floor(rp), rf = rp - ri;
  var r1 = ROUTE[ri], r2 = ROUTE[Math.min(ri+1, ROUTE.length-1)];
  var px = lerp(r1[0], r2[0], rf) * w;
  var py = lerp(r1[1], r2[1], rf) * h;
  cx.beginPath(); cx.arc(px, py, 10, 0, Math.PI*2); cx.fillStyle = "rgba(0,212,255,0.15)"; cx.fill();
  cx.beginPath(); cx.arc(px, py,  5, 0, Math.PI*2); cx.fillStyle = "#00d4ff"; cx.fill();
  cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.stroke();

  // Compass
  cx.beginPath(); cx.arc(w-20, 20, 12, 0, Math.PI*2);
  cx.fillStyle = "rgba(0,0,0,0.5)"; cx.fill();
  cx.strokeStyle = "rgba(255,255,255,0.2)"; cx.lineWidth = 1; cx.stroke();
  cx.fillStyle = "#ef4444";
  cx.beginPath(); cx.moveTo(w-20,9); cx.lineTo(w-23,20); cx.lineTo(w-17,20); cx.closePath(); cx.fill();
  cx.fillStyle = "rgba(255,255,255,0.4)";
  cx.beginPath(); cx.moveTo(w-20,31); cx.lineTo(w-23,20); cx.lineTo(w-17,20); cx.closePath(); cx.fill();
  cx.fillStyle = "#fff"; cx.font = "bold 7px monospace"; cx.textAlign = "center";
  cx.fillText("N", w-20, 16); cx.textAlign = "left";
}
