// keeps 3 clips preloaded ahead so there's no gap when one ends
var PRELOAD_COUNT = 3;

var clips      = [];
var currentIdx = -1;
var queue      = []; // each entry: { idx, clip, status, url, pollProgress }

var onReady    = null;
var onError    = null;
var onAdvance  = null;

function initQueue(clipList, startIdx, readyCb, errorCb, advanceCb) {
  clips      = clipList;
  currentIdx = startIdx;
  queue      = [];
  onReady    = readyCb   || function() {};
  onError    = errorCb   || function() {};
  onAdvance  = advanceCb || function() {};

  for (var i = startIdx; i < Math.min(startIdx + PRELOAD_COUNT + 1, clips.length); i++) {
    addToQueue(i);
  }
}

function advanceQueue() {
  currentIdx++;
  if (currentIdx >= clips.length) return null;

  // remove entries that are behind the current position
  queue = queue.filter(function(e) { return e.idx >= currentIdx; });

  // preload one more ahead
  var next = currentIdx + PRELOAD_COUNT;
  if (next < clips.length) addToQueue(next);

  if (onAdvance) onAdvance(currentIdx);
  return queue[0] || null;
}

function getCurrentEntry() {
  return queue.find(function(e) { return e.idx === currentIdx; }) || null;
}

function getQueueSnapshot() {
  return queue.slice(0, PRELOAD_COUNT + 1);
}

function resetQueue() {
  queue      = [];
  currentIdx = -1;
  clips      = [];
}

function addToQueue(idx) {
  if (queue.find(function(e) { return e.idx === idx; })) return;

  var clip  = clips[idx];
  var entry = { idx: idx, clip: clip, status: "requesting", url: null };
  queue.push(entry);
  queue.sort(function(a, b) { return a.idx - b.idx; });

  startClipPlayback(clip.filename)
    .then(function(res) {
      if (!res.success) {
        entry.status = "error";
        onError(entry);
        return;
      }

      entry.status = "polling";
      var url = getVideoUrl(clip.filename);
      entry.url = url;

      waitForClip(
        url,
        function(readyUrl) {
          entry.status = "ready";
          entry.url    = readyUrl;
          onReady(entry);
        },
        function() {
          entry.status = "error";
          onError(entry);
        },
        function(tries, max) {
          entry.pollProgress = { tries: tries, max: max };
        }
      );
    })
    .catch(function() {
      entry.status = "error";
      onError(entry);
    });
}
