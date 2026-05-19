var PRELOAD_COUNT = 3;

var clips = [];

var currentIdx = -1;

var queue = [];

var onReady = null;
var onError = null;
var onAdvance = null;

// --------------------------------------------------
// INIT
// --------------------------------------------------

function initQueue(
  clipList,
  startIdx,
  readyCb,
  errorCb,
  advanceCb
) {
  clips = clipList;

  currentIdx = startIdx;

  queue = [];

  onReady = readyCb || function () {};

  onError = errorCb || function () {};

  onAdvance =
    advanceCb || function () {};

  for (
    var i = startIdx;
    i <
    Math.min(
      startIdx +
        PRELOAD_COUNT +
        1,
      clips.length
    );
    i++
  ) {
    addToQueue(i);
  }
}

// --------------------------------------------------
// ADVANCE
// --------------------------------------------------

function advanceQueue() {
  currentIdx++;

  if (currentIdx >= clips.length) {
    return null;
  }

  queue = queue.filter(
    function (e) {
      return (
        e.idx >= currentIdx
      );
    }
  );

  var next =
    currentIdx +
    PRELOAD_COUNT;

  if (next < clips.length) {
    addToQueue(next);
  }

  if (onAdvance) {
    onAdvance(currentIdx);
  }

  return queue[0] || null;
}

// --------------------------------------------------

function getCurrentEntry() {
  return (
    queue.find(function (e) {
      return (
        e.idx === currentIdx
      );
    }) || null
  );
}

function getQueueSnapshot() {
  return queue.slice(
    0,
    PRELOAD_COUNT + 1
  );
}

// --------------------------------------------------

function resetQueue() {
  queue = [];

  currentIdx = -1;

  clips = [];
}

// --------------------------------------------------
// ADD TO QUEUE
// --------------------------------------------------

function addToQueue(idx) {
  if (
    queue.find(function (e) {
      return e.idx === idx;
    })
  ) {
    return;
  }

  var clip = clips[idx];

  if (!clip) {
    return;
  }

  var entry = {
    idx: idx,

    clip: clip,

    status: "requesting",

    url: null,

    retries: 0,

    pollProgress: null,
  };

  queue.push(entry);

  queue.sort(function (a, b) {
    return a.idx - b.idx;
  });

  console.log(
    "REQUESTING:",
    clip.filename
  );

  // ------------------------------------------------
  // START DEVICE UPLOAD
  // ------------------------------------------------

  startClipPlayback(
    clip.filename
  )
    .then(function (res) {
      console.log(
        "START RESPONSE:",
        res
      );

      if (!res.success) {
        retryQueueEntry(
          entry
        );

        return;
      }

      entry.status =
        "polling";

      console.log(
        "WAITING FOR READY:",
        clip.filename
      );

      // --------------------------------------------
      // WAIT FOR BACKEND READY
      // --------------------------------------------

      waitForClip(
        clip.filename,

        // READY
        function (readyUrl) {
          console.log(
            "READY:",
            readyUrl
          );

          entry.status =
            "ready";

          entry.url =
            readyUrl;

          onReady(entry);
        },

        // FAIL
        function () {
          console.log(
            "NOT READY YET:",
            clip.filename
          );

          retryQueueEntry(
            entry
          );
        },

        // POLLING
        function (
          tries,
          max
        ) {
          entry.pollProgress =
            {
              tries: tries,
              max: max,
            };
        }
      );
    })

    .catch(function (err) {
      console.error(
        "QUEUE ERROR:",
        err
      );

      retryQueueEntry(entry);
    });
}

// --------------------------------------------------
// RETRY LOGIC
// --------------------------------------------------

function retryQueueEntry(
  entry
) {
  entry.retries++;

  // ----------------------------------------------
  // RETRY BEFORE FAILING
  // ----------------------------------------------

  if (entry.retries < 10) {
    entry.status =
      "polling";

    console.log(
      "RETRYING:",
      entry.clip.filename,
      "attempt:",
      entry.retries
    );

    setTimeout(function () {
      startClipPlayback(
        entry.clip.filename
      )
        .then(function () {
          waitForClip(
            entry.clip.filename,

            // READY
            function (
              readyUrl
            ) {
              entry.status =
                "ready";

              entry.url =
                readyUrl;

              onReady(entry);
            },

            // FAIL AGAIN
            function () {
              retryQueueEntry(
                entry
              );
            }
          );
        })

        .catch(function () {
          retryQueueEntry(
            entry
          );
        });
    }, 5000);

    return;
  }

  // ----------------------------------------------
  // FINAL FAILURE
  // ----------------------------------------------

  entry.status = "error";

  console.log(
    "FINAL ERROR:",
    entry.clip.filename
  );

  onError(entry);
}