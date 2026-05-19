// main logic: user clicks timeline -> find clip -> request from device -> play -> auto advance

function seekToTime(targetMs) {
  var tl = appState.timeline;
  if (!tl) return;

  var clips = getActiveClips();
  if (!clips.length) {
    setState({ statusMsg: "No clips for selected camera." });
    return;
  }

  var idx = findClipAt(clips, targetMs);
  if (idx === -1) {
    // snap to nearest clip after the clicked point
    for (var i = 0; i < clips.length; i++) {
      if (clips[i].timestamp >= targetMs) { idx = i; break; }
    }
    if (idx === -1) idx = 0;
  }

  var offset = seekOffset(clips[idx], targetMs);

  setState({
    activeClips:  clips,
    currentIdx:   idx,
    startOffset:  offset,
    playerState:  "loading",
    statusMsg:    "Requesting clip from device...",
  });

  resetQueue();
  initQueue(clips, idx, onClipReady, onClipError, onQueueMove);
  renderClipList();
}

function onClipReady(entry) {
  var cur = getCurrentEntry();
  if (cur && cur.idx === entry.idx) {
    loadClip(entry.url, entry.clip.timestamp, appState.startOffset);
    setState({ startOffset: 0 });
  }
  updateQueueBar();
}

function onClipError(entry) {
  var cur = getCurrentEntry();
  if (cur && cur.idx === entry.idx) {
    setState({ playerState: "error", statusMsg: "Clip failed. Skipping..." });
    setTimeout(function() { goToNextClip(); }, 2000);
  }
  updateQueueBar();
}

function onQueueMove(newIdx) {
  setState({ currentIdx: newIdx });
  renderClipList();
  updateQueueBar();
}

// called when current video finishes playing
function clipEnded() {
  goToNextClip();
}

function goToNextClip() {
  var next = advanceQueue();
  if (!next) {
    setState({ playerState: "idle", statusMsg: "No more clips." });
    return;
  }
  if (next.status === "ready") {
    loadClip(next.url, next.clip.timestamp, 0);
  } else {
    setState({ playerState: "loading", statusMsg: "Loading next clip... (" + next.clip.displayTime + ")" });
  }
}

function loadVideoList(forceRefresh) {
  setState({ statusMsg: "Fetching video list...", videoListReady: false });

  function doFetch() {
    getVideoList(appState.imei)
      .then(function(res) {
        if (!res.success || !res.videos || !res.videos.length) {
          setState({ statusMsg: "No videos found. Try Refresh to wake the device." });
          return;
        }
        var tl = buildTimeline(res.videos);
        setState({
          rawFiles:       res.videos,
          timeline:       tl,
          videoListReady: true,
          statusMsg:      res.videos.length + " clips found. Click the timeline to play.",
        });
        renderTimeline(tl);
        renderClipList();
      })
      .catch(function() {
        setState({ statusMsg: "Could not fetch video list. Check your connection." });
      });
  }

  if (forceRefresh) {
    setState({ statusMsg: "Waking device... please wait." });
    requestVideoList(appState.imei)
      .then(function() { setTimeout(doFetch, 5000); })
      .catch(doFetch);
  } else {
    doFetch();
  }
}

function getActiveClips() {
  var tl = appState.timeline;
  if (!tl) return [];
  return appState.camera === "Inward" ? tl.inClips : tl.fwdClips;
}
