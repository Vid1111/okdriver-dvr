// dvrStore.js - Global application state (no framework needed)

var CLIPS = [
  { id:1, title:"Session Start",  startTime:"07:38:00", dur:"5:22", type:"normal", event:null,                                   road:"NH-48, Pune",          gps:{lat:18.510,lng:73.840}, avgSpeed:47 },
  { id:2, title:"Highway Merge",  startTime:"07:43:22", dur:"7:14", type:"normal", event:null,                                   road:"NH-48, Pune",          gps:{lat:18.515,lng:73.845}, avgSpeed:76 },
  { id:3, title:"Hard Braking",   startTime:"07:50:36", dur:"3:08", type:"event",  event:{sev:"danger",  label:"HARD BRAKING"},  road:"NH-48, Pune",          gps:{lat:18.520,lng:73.857}, avgSpeed:42 },
  { id:4, title:"Lane Deviation", startTime:"07:53:44", dur:"4:55", type:"event",  event:{sev:"warning", label:"LANE DEVIATION"},road:"Baner Road, Pune",     gps:{lat:18.526,lng:73.789}, avgSpeed:51 },
  { id:5, title:"Normal Drive",   startTime:"07:58:39", dur:"6:30", type:"normal", event:null,                                   road:"Aundh Road, Pune",     gps:{lat:18.532,lng:73.802}, avgSpeed:60 },
  { id:6, title:"Overspeeding",   startTime:"08:09:09", dur:"2:44", type:"event",  event:{sev:"danger",  label:"OVERSPEEDING 94 KM/H"}, road:"Mumbai-Pune Exp", gps:{lat:18.518,lng:73.765}, avgSpeed:88 },
  { id:7, title:"Traffic Stop",   startTime:"08:11:53", dur:"8:22", type:"normal", event:null,                                   road:"FC Road, Pune",        gps:{lat:18.511,lng:73.823}, avgSpeed:6  },
  { id:8, title:"Parking",        startTime:"08:20:15", dur:"3:26", type:"normal", event:null,                                   road:"JM Road, Pune",        gps:{lat:18.505,lng:73.845}, avgSpeed:3  },
];

// Where each clip starts on the 0-1 timeline (session = 45 min inside a 24hr bar)
var CLIP_POS = [0.20, 0.26, 0.32, 0.36, 0.42, 0.54, 0.57, 0.68];

var SESSION_EVENTS = [
  { sev:"danger",  label:"Hard Braking",           time:"07:50:36", clipIdx:2 },
  { sev:"warning", label:"Lane Deviation",          time:"07:53:44", clipIdx:3 },
  { sev:"danger",  label:"Overspeeding (94 km/h)", time:"08:09:09", clipIdx:5 },
  { sev:"info",    label:"Session Start",           time:"07:38:00", clipIdx:0 },
];

var HEADINGS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

var ROUTE = [
  [0.12,0.72],[0.24,0.65],[0.36,0.55],[0.48,0.50],
  [0.58,0.42],[0.66,0.32],[0.74,0.26],[0.85,0.30]
];

// Single global state object — all components read/write this
var state = {
  playing:      true,
  speed:        1,
  progress:     0.20,   // 0 to 1 across the full 45-min session
  clipIdx:      0,
  speedHistory: [],
  gforceHistory:[],
};

// Pre-fill telemetry history
for (var _i = 0; _i < 40; _i++) {
  state.speedHistory.push(30 + Math.random() * 60);
  state.gforceHistory.push(Math.random() * 0.8);
}

// ── Utility functions used by multiple components ──────────
function pad(n) { return String(n).padStart(2, "0"); }

function progressToTimecode(p) {
  var base = (7 * 60 + 38) * 60;
  var s    = base + Math.round(p * 45 * 60);
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
}

function clipProgressPct(i) {
  var s = CLIP_POS[i] || 0;
  var e = CLIP_POS[i + 1] || 1;
  if (state.progress <= s) return 0;
  if (state.progress >= e) return 100;
  return Math.round((state.progress - s) / (e - s) * 100);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function selectClip(i) {
  state.clipIdx  = i;
  state.progress = CLIP_POS[i];
  renderClipList();
  updateClipIndicator();
  drawMap();
}

function updateClipIndicator() {
  document.getElementById("clipCur").textContent  = state.clipIdx + 1;
  document.getElementById("clipName").textContent = CLIPS[state.clipIdx].title;
}
