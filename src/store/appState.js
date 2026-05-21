export var appState = {
  imei:           "864993060968006",
  vehicle:        "DL5CJ7355",
  date:           "2026-05-07",
  camera:         "Forward",

  videoListReady: false,
  rawFiles:       [],
  timeline:       null,

  activeClips:    [],
  currentIdx:     -1,

  playerState:    "idle",
  currentUrl:     null,
  startOffset:    0,

  cursorMs:       0,
  statusMsg:      "Select a date and click Search.",
  pollStatus:     null,
};

var listeners = [];

export function onStateChange(fn) {
  listeners.push(fn);
}

export function setState(changes) {

  Object.keys(changes)
    .forEach(function(k) {

      appState[k] =
        changes[k];

    });

  listeners.forEach(function(fn) {
    fn(appState);
  });
}