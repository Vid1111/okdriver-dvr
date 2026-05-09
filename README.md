# okDriver DVR — History Playback Feature

> **BML Munjal University · Full Stack Developer Assignment**
> Built on the okDriver Smart Dashcam Platform

---

## Feature Overview

A **DVR-style History Playback** interface that lets fleet managers and drivers review dashcam recordings with full playback control, an interactive timeline, auto-play between clips, seamless video navigation, and live telemetry.

| Feature | Description |
|---|---|
| **Clickable 24-hour timeline** | Scrub anywhere; red/amber event markers pinned to exact timestamps |
| **Auto-play between clips** | Advances through all 8 clips automatically — no manual intervention |
| **Playback speed control** | 0.5×, 1×, 2×, 4× |
| **Previous / Next clip** | Jump between clips instantly |
| **Seek ±30 seconds** | Fine-grained navigation within a clip |
| **Live telemetry** | Speed, G-force, RPM, heading updated every animation frame |
| **Sparkline charts** | Scrolling speed and G-force history |
| **Interactive route map** | Canvas-drawn route with event pins and live position cursor |
| **Event jump** | Click any session event in Telemetry tab to jump to that timecode |
| **Clip progress bars** | Each clip shows live playthrough percentage |
| **Event severity overlays** | Red vignette for danger events, amber for warnings |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | Plain HTML5 |
| Styling | Plain CSS3 (custom properties, flexbox, grid) |
| Logic | Vanilla JavaScript (ES5 compatible, no framework) |
| Rendering | HTML5 Canvas API |
| Animation | `requestAnimationFrame` loop |
| Dependencies | **None** |

No build tool. No bundler. No npm install required to run.

---

## Project Structure

```
okdriver-dvr/
├── index.html                   # Entry point — loads all scripts
├── package.json                 # Project metadata (optional serve script)
├── README.md
├── .gitignore
└── src/
    ├── App.css                  # All styles (dark theme design system)
    ├── main.js                  # App boot, animation loop, tab switching
    ├── store/
    │   └── dvrStore.js          # Global state + shared data (clips, events, route)
    └── components/
        ├── DVRPlayer.js         # Canvas video renderer + HUD overlay
        ├── Timeline.js          # Clickable 24h timeline + scrubbing
        ├── PlaybackControls.js  # Transport buttons + speed selector
        ├── ClipList.js          # Sidebar clip list with thumbnails
        ├── TelemetryPanel.js    # Sparklines + session event list
        └── MapPanel.js          # Canvas route map with live cursor
```

---

## Setup & Running

### Option 1 — Just open the file (simplest)

```
Double-click index.html → opens in any browser
```

That's it. No install, no terminal, no server needed.

### Option 2 — Local server (recommended to avoid CORS on some browsers)

```bash
# Using Node (optional)
npm install
npm start
# → http://localhost:3000

# Or using Python (if installed)
python -m http.server 3000
# → http://localhost:3000

# Or using VS Code
Install "Live Server" extension → right-click index.html → Open with Live Server
```

---

## How to Use

| Action | How |
|---|---|
| **Seek** | Click anywhere on the timeline bar |
| **Scrub** | Click and drag on the timeline |
| **Play / Pause** | Click the video or the ⏸ button |
| **Change speed** | Click 0.5×, 1×, 2×, or 4× |
| **Next / Prev clip** | Click ⏩ / ⏪ buttons |
| **Seek ±30s** | Click ⏭ / ⏮ buttons |
| **Jump to event** | Telemetry tab → click any session event |
| **View route** | Click the Map tab |

---

## Architecture Notes

**Global state object** — `dvrStore.js` holds all playback state (`progress`, `clipIdx`, `playing`, `speed`, telemetry history). Every component reads and writes directly to this object — no framework needed.

**Delta-time animation** — Progress advances by `(dt / 1000) × speed × (1 / 2700)` per frame, making playback speed frame-rate independent.

**Auto clip selection** — Inside the animation loop, `clipIdx` is derived from `progress` crossing `CLIP_POS` boundaries automatically — no polling or events required.

**Script load order** — `dvrStore.js` loads first (defines global data + helpers), then components (define functions), then `main.js` last (calls them to boot the app).

---

## Author

Built for the BML Munjal University × okDriver Full Stack Assignment, May 2026.
