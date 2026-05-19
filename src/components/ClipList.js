var clipListEl = null;

function initClipList(el) {
  clipListEl = el;
}

function renderClipList() {
  if (!clipListEl) return;

  var clips = appState.activeClips.length
    ? appState.activeClips
    : (appState.timeline ? appState.timeline.fwdClips : []);

  if (!clips.length) {
    clipListEl.innerHTML = '<div class="cl-empty">No clips loaded.</div>';
    return;
  }

  var qsnap = getQueueSnapshot();
  var qmap  = {};
  qsnap.forEach(function(e) { qmap[e.idx] = e; });

  clipListEl.innerHTML = clips.map(function(c, i) {
    var active  = i === appState.currentIdx;
    var qentry  = qmap[i];
    var qs      = qentry ? qentry.status : "";
    var badge   = "";
    if (qs === "ready")      badge = '<span class="cl-badge qs-ready">READY</span>';
    if (qs === "polling")    badge = '<span class="cl-badge qs-polling">LOADING</span>';
    if (qs === "requesting") badge = '<span class="cl-badge qs-requesting">QUEUED</span>';
    if (qs === "error")      badge = '<span class="cl-badge qs-error">ERROR</span>';

    return '<div class="cl-item' + (active ? " active" : "") + '" onclick="seekToTime(' + c.timestamp + ')">'
      + '<div class="cl-time">' + c.displayTime + '</div>'
      + '<div class="cl-info">'
      +   '<div class="cl-cam">'  + c.cameraType + '</div>'
      +   '<div class="cl-dur">3:00</div>'
      + '</div>'
      + badge
      + '</div>';
  }).join("");
}

function updateQueueBar() {
  var bar = document.getElementById("queueBar");
  if (!bar) return;

  var snap = getQueueSnapshot();
  if (!snap.length) { bar.innerHTML = ""; return; }

  bar.innerHTML = snap.map(function(e, i) {
    var label = i === 0 ? "NOW" : "+" + i;
    return '<div class="qb-item qb-' + e.status + '">'
      + '<span>' + label + '</span>'
      + '<span>' + e.clip.displayTime + '</span>'
      + '</div>';
  }).join("");
}
