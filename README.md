# okDriver DVR History Playback

Continuous DVR-style history playback for the okDriver smart dashcam platform — built as part of the Full Stack Developer assignment.

---

## What This Does

The existing okDriver History module only plays one `.ts` clip at a time and makes you manually click the next one. This project replaces that experience with something closer to a CP Plus / Hikvision DVR:

- Click anywhere on the timeline → video jumps to that exact moment
- Clip ends → next clip loads automatically, no button press needed
- Upcoming clips are pre-fetched in the background so transitions are fast
- A scrubber moves along the timeline in real time as video plays
- Loading states show exactly what's happening while waiting for the device

---

## Setup

No build step required. The project is vanilla JavaScript (ES modules) and runs directly in the browser.

**Option 1 — Open directly**

Open `index.html` in Chrome or Edge. Some browsers block ES module imports from `file://` URLs, so if nothing loads, use Option 2.

**Option 2 — Local HTTP server (recommended)**

```bash
python -m http.server 3000
```

Then open `http://localhost:3000` in Chrome.

**Option 3 — VS Code Live Server**

Install the Live Server extension, right-click `index.html`, and choose "Open with Live Server".

---

## How to Use

1. Open the app
2. In the left sidebar, the IMEI and date are pre-filled with the test device (`864993060968006`, `2026-05-07`)
3. Click **Search** — this calls API 1 to wake the device and then API 2 to fetch the clip list
4. The timeline fills in with blue segments (Forward cam) and green segments (Inward cam)
5. Click anywhere on the timeline to jump to that time, or click a clip row in the list
6. The app requests that clip from the device (API 3), waits for it to upload, then plays it
7. When the clip ends, the next one loads automatically

---

## Project Structure

```
okdriver-dvr/
├── index.html                  # Single HTML shell, loads main.js as an ES module
├── src/
│   ├── App.css                 # All styles
│   ├── main.js                 # Entry point — builds the DOM, wires everything together
│   ├── utils/
│   │   ├── clipUtils.js        # Filename parser, timeline builder, seek offset calculator
│   │   └── api.js              # All HTTP calls (API 1, 2, 3 + ready polling)
│   ├── store/
│   │   ├── appState.js         # Shared state object + simple observer pattern
│   │   └── clipQueue.js        # DVR-style pre-fetch queue
│   └── components/
│       ├── Timeline.js         # Interactive timeline bar + scrubber
│       ├── VideoPlayer.js      # HTML5 video wrapper
│       ├── ClipList.js         # Sidebar clip list with queue status badges
│       └── PlaybackController.js  # Coordinates APIs, queue, and video player
```

---

## How It Works

### The Three-API Pipeline

The platform uses a three-step flow to get video playing:

**API 1 — Wake the device**
```
POST /api/playback/request-list/{imei}
Body: { "useTFCard": true }
```
Sends a FILELIST + TFFILELIST command to the physical dashcam. The device scans its TF card and asynchronously POSTs the video file inventory back to the server. This is fire-and-forget from our side.

**API 2 — Fetch the clip inventory**
```
GET /api/playback/videos/{imei}
```
Returns an array of `.ts` filenames. May return empty initially while the device is still scanning, so the app retries up to 20 times (every 3 seconds) before giving up.

Each filename encodes all the metadata we need:
```
2026_05_07_09_30_00_03.ts
 YYYY MM DD HH MM SS CC
                      └── 03 = Forward cam, 04 = Inward cam
```

**API 3 — Request a specific clip**
```
POST /api/playback/start/{imei}
Body: { "videoName": "2026_05_07_09_30_00_03.ts", "protocol": "http", "force": true }
```
Tells the device to upload that specific `.ts` file. The device processes this asynchronously — the response just confirms the command was queued. We then poll a `/ready` endpoint every 3 seconds until the file is available for streaming.

---

### Timeline Click → Playback

When the user clicks on the timeline at, say, 09:31:30:

1. `handleSeek()` in `Timeline.js` converts the click X position to a millisecond timestamp
2. `seekToTime(ms)` in `PlaybackController.js` calls `findClipAt()` to identify which clip covers that timestamp
3. `seekOffset()` calculates that we're 90 seconds into the clip (09:30:00 → 09:31:30)
4. The old queue is destroyed (prevents stale API 3 callbacks from interfering)
5. A new queue is initialised from that clip index
6. API 3 is called for that clip + the next 3 clips
7. `waitForClip()` polls every 3 seconds until the clip is uploaded
8. `onClipReady()` fires, calls `loadClip()`, video starts playing from the 90-second offset

---

### Pre-fetch Queue

The queue in `clipQueue.js` keeps a rolling window of `[current, next, +2, +3]` clips.

As soon as clip N starts playing, API 3 is already being called for clips N+1, N+2, N+3 in the background. By the time clip N ends, clip N+1 is usually already uploaded. The auto-advance then loads it immediately with no waiting.

Queue entry lifecycle:
```
requesting → polling → ready
                    ↘ error (after 3 retries)
```

If a clip request fails (API error or upload timeout), it retries automatically up to 3 times with an 8-second delay between attempts.

---

### Auto-advance

The HTML5 video `ended` event calls `clipEnded()` in `PlaybackController.js`. This calls `advanceQueue()`, which moves the pointer and returns the next entry. If it's already `ready`, `loadClip()` is called immediately. If it's still uploading, the loading screen shows and `onClipReady()` fires when it's done.

---

### Timeline Scrubber

The video element fires `timeupdate` roughly 4 times per second while playing. `updateHud()` in `main.js` converts `video.currentTime` back to a wall-clock timestamp (clip start timestamp + current seconds), then calls `moveScrubber(ms)` in `Timeline.js` to position the red line as a percentage of the full timeline span.

---

## Feature Checklist

| # | Feature | Status |
|---|---------|--------|
| 1 | Clickable timeline triggers correct API 3 call | ✅ Done |
| 2 | Video plays from correct offset within the clip | ✅ Done |
| 3 | Auto-advance to next clip when current ends | ✅ Done |
| 4 | Real-time scrubber on the timeline | ✅ Done |
| 5 | Loading state shown while waiting for device upload | ✅ Done |
| 6 | Dual camera sync (FWD + IN side by side) | 🔶 Partial — both tracks rendered in timeline, pairMap built in data model, UI side-by-side render is a next step |
| 7 | Clip pre-fetching before current clip ends | ✅ Done (3-clip lookahead queue) |
| 8 | Clean code with comments | ✅ Done |

---

## Known Issues

### Split clip delivery

Some clips arrive from the device as multiple shorter segments instead of one 3-minute file. In the screen recording you can see a 1-minute clip appearing as three separate entries. This is a device-side upload behaviour — the dashcam splits the upload into smaller HTTP POST chunks before the server reassembles them. The frontend handles each entry as an individual queue item. A proper fix would be server-side segment reassembly before serving the URL, or exposing an HLS `.m3u8` playlist.

### `.ts` file browser compatibility

Raw MPEG Transport Stream files have inconsistent support across browsers. Chrome and Edge handle them in most cases. If a clip fails to play despite loading correctly, it's a codec negotiation issue between the browser and the raw `.ts` container. A production setup would transcode to fragmented MP4 or serve HLS.

### Inward camera same timestamps

The Inward (channel 04) clips share the same timestamps as Forward (channel 03) clips because both cameras record simultaneously. The timeline renders them on separate tracks and `buildTimeline()` pairs them in `pairMap` — the data model for dual-camera sync is already in place, the UI renderer just needs the side-by-side layout.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript (ES Modules) |
| Styling | CSS |
| Video | HTML5 `<video>` element |
| API | REST (3-API pipeline) |
| Timeline | Custom DOM rendering |
| Build | None required |

---

## Test Credentials

| | |
|---|---|
| Platform | https://dashcam.okdriver.in |
| Login | demo@okdriver.in |
| Password | 12345678 |
| Vehicle | DL5CJ7355 |
| IMEI | 864993060968006 |
| API Base | http://smart.okdriver.in:5000 |

After login: Monitor → History tab → Select vehicle DL5CJ7355 → Date 2026-05-07

---

## Future Improvements

- HLS.js integration for proper `.ts` stream support across all browsers
- Server-side segment reassembly to fix split clip delivery
- Dual-camera side-by-side layout (the data model is already ready)
- IndexedDB caching for clip metadata so re-opening the same date is instant
- Timeline zoom (currently spans full day — zooming into a 1-hour window would help)
- Gap detection — show visual breaks in the timeline where footage is missing
- Playback speed indicator on the video HUD
