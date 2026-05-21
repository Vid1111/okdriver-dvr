// filename format from device: YYYY_MM_DD_HH_MM_SS_CC.ts
// CC = 03 means ForwardCam, 04 means InwardCam
// each clip is 3 minutes long

export var CLIP_DURATION = 180; // seconds

export function parseFilename(filename) {
  var name = filename.replace(/\.ts$/i, "");
  var p = name.split("_");
  if (p.length !== 7) return null;

  var yr  = parseInt(p[0], 10);
  var mo  = parseInt(p[1], 10);
  var dy  = parseInt(p[2], 10);
  var hr  = parseInt(p[3], 10);
  var min = parseInt(p[4], 10);
  var sec = parseInt(p[5], 10);
  var ch  = p[6];

  if (isNaN(yr) || isNaN(hr)) return null;

  var date = new Date(yr, mo - 1, dy, hr, min, sec);
  var ts   = date.getTime();

  return {
    filename:    filename,
    channelCode: ch,
    cameraType:  ch === "03" ? "ForwardCam" : "InwardCam",
    isForward:   ch === "03",
    isInward:    ch === "04",
    timestamp:   ts,
    endTimestamp: ts + CLIP_DURATION * 1000,
    displayTime: twoDigit(hr) + ":" + twoDigit(min) + ":" + twoDigit(sec),
    dateStr:     yr + "-" + twoDigit(mo) + "-" + twoDigit(dy),
    durationSec: CLIP_DURATION,
  };
}

export function buildTimeline(filenames) {
  var all = [];
  filenames.forEach(function(f) {
    var c = parseFilename(f);
    if (c) all.push(c);
  });

  all.sort(function(a, b) { return a.timestamp - b.timestamp; });

  var fwdClips = all.filter(function(c) { return c.isForward; });
  var inClips  = all.filter(function(c) { return c.isInward; });

  // pair forward and inward clips that share the same start time
  var pairMap = {};
  all.forEach(function(c) {
    var key = String(c.timestamp);
    if (!pairMap[key]) pairMap[key] = { fwd: null, in: null };
    if (c.isForward) pairMap[key].fwd = c;
    else             pairMap[key].in  = c;
  });

  return {
    all:      all,
    fwdClips: fwdClips,
    inClips:  inClips,
    pairMap:  pairMap,
    start:    all.length ? all[0].timestamp : Date.now(),
    end:      all.length ? all[all.length - 1].endTimestamp : Date.now(),
  };
}

export function findClipAt(clips, targetMs) {
  for (var i = 0; i < clips.length; i++) {
    if (targetMs >= clips[i].timestamp && targetMs < clips[i].endTimestamp) return i;
  }
  return -1;
}

export function seekOffset(clip, targetMs) {
  return Math.max(0, (targetMs - clip.timestamp) / 1000);
}

function twoDigit(n) { return String(n).padStart(2, "0"); }
