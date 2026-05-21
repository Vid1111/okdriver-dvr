// appState.js
// Central state store for the DVR player.
//
// I went with a simple observable object pattern here instead of pulling in a
// state management library. The app is small enough that a single shared object
// with a listener list is the simplest thing that works.
//
// Any component can call setState({ key: value }) to update the shared state,
// and anything that called onStateChange() will be notified immediately.

export var appState = {
  // Device / search params — set from the sidebar form
  imei:           "864993060968006",
  vehicle:        "DL5CJ7355",
  date:           "2026-05-07",
  camera:         "Forward",  // "Forward" | "Inward" | "Both"

  // Video list data from API 2
  videoListReady: false,
  rawFiles:       [],       // raw filename strings from the API
  timeline:       null,     // parsed timeline object from buildTimeline()

  // Playback state
  activeClips:    [],       // the clip list currently being played (fwd or inward)
  currentIdx:     -1,       // index of the currently playing clip in activeClips

  playerState:    "idle",   // "idle" | "loading" | "buffering" | "playing" | "paused" | "error"
  currentUrl:     null,
  startOffset:    0,        // seconds into the clip to seek to on load

  // Timeline scrubber position in milliseconds
  cursorMs:       0,

  // UI messages
  statusMsg:      "Select a date and click Search.",
  pollStatus:     null,
};

var listeners = [];

// Register a function to be called whenever state changes.
// Used by main.js to update the loading screen and status text.
export function onStateChange(fn) {
  listeners.push(fn);
}

// setState()
// Merges changes into appState and notifies all listeners.
// Only the keys you pass get updated — everything else stays the same.
export function setState(changes) {
  Object.keys(changes).forEach(function(k) {
    appState[k] = changes[k];
  });

  // Notify all listeners synchronously
  listeners.forEach(function(fn) {
    fn(appState);
  });
}
