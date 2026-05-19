# okDriver DVR History Playback

DVR-style continuous video playback for the okDriver dashcam platform.  
Built for the BML Munjal University Full Stack Developer Assignment.

## What this does

The existing History page on okDriver plays one 3-minute clip at a time and stops. This replaces that with continuous playback — like a CP Plus or Hikvision DVR:

- Click anywhere on the 24-hour timeline to start playing from that exact moment
- When a clip ends, the next one loads and plays automatically
- 3 clips are preloaded in the background at all times to avoid gaps
- A scrubber moves along the timeline as the video plays

## How to run

**Option 1 — open directly**
Just double-click `index.html` in Chrome or Edge.

**Option 2 — local server (avoids CORS on some browsers)**
```bash
python -m http.server 3000
```
Then open `http://localhost:3000`

**Option 3 — VS Code**
Install the Live Server extension, right-click `index.html`, Open with Live Server.

## How to use

1. Click **Search** to load available clips (calls API 2)
2. Click **Refresh** if no clips appear — this wakes the physical device (API 1)
3. Click anywhere on the **HISTORY TIMELINE** to start playback from that time
4. Video plays automatically and moves to the next clip when it ends
5. The queue bar at the top of the sidebar shows NOW / +1 / +2 / +3 preload status

## Project structure

```
okdriver-dvr/
├── index.html
├── src/
│   ├── App.css
│   ├── main.js                        # boots the app, wires up all buttons
│   ├── utils/
│   │   ├── clipUtils.js               # parses filenames, builds timeline data
│   │   └── api.js                     # API 1, 2, 3 calls + polling logic
│   ├── store/
│   │   ├── appState.js                # global state object
│   │   └── clipQueue.js               # preload queue — always keeps 3 clips ahead
│   └── components/
│       ├── Timeline.js                # renders 24h bar, handles click/drag seek
│       ├── VideoPlayer.js             # HLS.js wrapper, fires ended event
│       ├── ClipList.js                # sidebar clip list with status badges
│       └── PlaybackController.js      # connects queue → player → timeline
```

## APIs used

| API | Endpoint | What it does |
|---|---|---|
| 1 | POST `/api/playback/request-list/{imei}` | Wakes device, triggers TF card scan |
| 2 | GET `/api/playback/videos/{imei}` | Returns list of available .ts filenames |
| 3 | POST `/api/playback/start/{imei}` | Tells device to upload a specific clip |

After API 3 is called, the device uploads asynchronously. The app polls the upload URL every 2 seconds (up to 60 seconds) until the file is available, then plays it.

## Device credentials

| | |
|---|---|
| Platform | https://dashcam.okdriver.in |
| Login | demo@okdriver.in / 12345678 |
| Vehicle | DL5CJ7355 |
| IMEI | 864993060968006 |
