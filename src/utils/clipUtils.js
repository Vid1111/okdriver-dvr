// clipUtils.js
// Utility functions for parsing video filenames and building the timeline data structure.
//
// The dashcam stores each clip as a .ts file with the timestamp baked into the filename.
// Format: YYYY_MM_DD_HH_MM_SS_CC.ts
//   - CC = 03 means Forward camera (road-facing)
//   - CC = 04 means Inward camera (cabin/driver-facing)
//
// I'm keeping these as pure functions with no side effects so they're easy to test
// and reuse in both the timeline renderer and the playback queue.

// Each clip is 3 minutes long. This is the standard segment length the device uses.
export var CLIP_DURATION = 180; // seconds

// parseFilename()
// Breaks a .ts filename into its parts and returns a clip metadata object.
// Returns null if the filename doesn't match the expected format.
export function parseFilename(filename) {
  // Strip the .ts extension first
  var name = filename.replace(/\.ts$/i, "");
  var p = name.split("_");

  // Filename must have exactly 7 parts: YYYY MM DD HH MM SS CC
  if (p.length !== 7) return null;

  var yr  = parseInt(p[0], 10);
  var mo  = parseInt(p[1], 10);
  var dy  = parseInt(p[2], 10);
  var hr  = parseInt(p[3], 10);
  var min = parseInt(p[4], 10);
  var sec = parseInt(p[5], 10);
  var ch  = p[6]; // channel code as string ("03" or "04")

  // Bail if any part failed to parse
  if (isNaN(yr) || isNaN(hr)) return null;

  // Build a JS Date from the parts so we get a proper millisecond timestamp
  var date = new Date(yr, mo - 1, dy, hr, min, sec);
  var ts   = date.getTime();

  return {
    filename:     filename,
    channelCode:  ch,
    cameraType:   ch === "03" ? "ForwardCam" : "InwardCam",
    isForward:    ch === "03",
    isInward:     ch === "04",
    timestamp:    ts,
    // endTimestamp lets us check if a click on the timeline falls inside this clip
    endTimestamp: ts + CLIP_DURATION * 1000,
    displayTime:  twoDigit(hr) + ":" + twoDigit(min) + ":" + twoDigit(sec),
    dateStr:      yr + "-" + twoDigit(mo) + "-" + twoDigit(dy),
    durationSec:  CLIP_DURATION,
  };
}

// buildTimeline()
// Takes the raw array of filenames from the API and organises them into
// separate forward/inward lists plus a paired map for dual-camera sync.
export function buildTimeline(filenames) {
  var all = [];

  filenames.forEach(function(f) {
    var c = parseFilename(f);
    if (c) all.push(c);
  });

  // Sort everything chronologically — the API doesn't guarantee order
  all.sort(function(a, b) { return a.timestamp - b.timestamp; });

  var fwdClips = all.filter(function(c) { return c.isForward; });
  var inClips  = all.filter(function(c) { return c.isInward; });

  // Build a map keyed by start timestamp so we can pair FWD and IN clips
  // that were recorded at the same time. Used for dual-camera sync later.
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
    // start/end let the timeline bar know the full span to render
    start:    all.length ? all[0].timestamp : Date.now(),
    end:      all.length ? all[all.length - 1].endTimestamp : Date.now(),
  };
}

// findClipAt()
// Finds which clip in a sorted list covers a given millisecond timestamp.
// Returns -1 if no clip covers that moment (gap in footage).
export function findClipAt(clips, targetMs) {
  for (var i = 0; i < clips.length; i++) {
    if (targetMs >= clips[i].timestamp && targetMs < clips[i].endTimestamp) {
      return i;
    }
  }
  return -1;
}

// seekOffset()
// Calculates how many seconds into a clip we should start playback
// so the video begins at the exact timestamp the user clicked.
// e.g. if clip starts at 09:30:00 and user clicked 09:31:30, offset = 90s
export function seekOffset(clip, targetMs) {
  return Math.max(0, (targetMs - clip.timestamp) / 1000);
}

// Small helper — pads a number to two digits (e.g. 7 -> "07")
function twoDigit(n) { return String(n).padStart(2, "0"); }
