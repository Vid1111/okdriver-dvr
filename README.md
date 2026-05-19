# okDriver DVR History Playback

Continuous DVR-style history playback system for the okDriver smart dashcam platform.

Built as part of the Full Stack Developer Assignment provided by okDriver / BML Munjal University. 

---

# Overview

The existing okDriver History Playback module only plays a single `.ts` clip at a time.
Users must manually select the next clip, and the timeline is non-interactive.

This project implements a DVR-like continuous playback experience similar to CP Plus / Hikvision systems.

Features implemented:

* Interactive 24-hour playback timeline
* Click-to-seek playback
* Continuous auto-play between clips
* Playback queue with preloading
* Timeline scrubber movement
* Loading and buffering states
* Playback polling system
* Clip metadata parsing
* Queue status visualization
* Timeline segment rendering for Forward/Inward cameras

---

# Features

## DVR-style Timeline Playback

* Click anywhere on the timeline to jump to that timestamp
* Automatically identifies the correct clip
* Starts playback from the correct offset

## Continuous Playback

* Automatically loads the next chronological clip
* No manual interaction required between clips
* Queue system keeps future clips ready

## Clip Queue System

Playback queue maintains:

* Current clip
* Next clip
* Buffered upcoming clips

This minimizes playback interruption.

## Timeline Visualization

* Separate ForwardCam / InwardCam tracks
* Real-time moving scrubber
* Clip markers rendered across the day

## Upload Polling Logic

The dashcam uploads videos asynchronously after API 3 is triggered.

The frontend:

* polls upload readiness
* retries automatically
* waits until the uploaded video becomes available

---

# Screenshots

## Original okDriver History Screen

The original platform only played one clip at a time and required manual navigation. 

## Improved DVR Playback UI

Implemented:

* queue controls
* timeline interaction
* continuous playback architecture
* playback polling
* preloading states

---

# Tech Stack

| Layer    | Technology                  |
| -------- | --------------------------- |
| Frontend | Vanilla JavaScript          |
| Styling  | CSS                         |
| Video    | HTML5 Video                 |
| APIs     | REST                        |
| Timeline | Custom Canvas/DOM rendering |

---

# Project Structure

```txt
okdriver-dvr/
├── index.html
├── src/
│   ├── App.css
│   ├── main.js
│   ├── utils/
│   │   ├── clipUtils.js
│   │   └── api.js
│   ├── store/
│   │   ├── appState.js
│   │   └── clipQueue.js
│   └── components/
│       ├── Timeline.js
│       ├── VideoPlayer.js
│       ├── ClipList.js
│       └── PlaybackController.js
```

---

# Setup

## Option 1 — Open Directly

Open:

```txt
index.html
```

in Chrome or Edge.

---

## Option 2 — Local HTTP Server

Recommended to avoid browser CORS restrictions.

```bash
python -m http.server 3000
```

Then open:

```txt
http://localhost:3000
```

---

## Option 3 — VS Code Live Server

* Install Live Server extension
* Right-click `index.html`
* Open with Live Server

---

# How It Works

## API Flow

The platform uses a 3-step playback pipeline. 

### API 1 — Request Video Scan

```http
POST /api/playback/request-list/{imei}
```

* Wakes the device
* Starts TF card scan
* Device asynchronously uploads video inventory

---

### API 2 — Fetch Video Inventory

```http
GET /api/playback/videos/{imei}
```

Returns:

```txt
YYYY_MM_DD_HH_MM_SS_CC.ts
```

Example:

```txt
2026_05_02_16_24_15_03.ts
```

This metadata is parsed to build the timeline.

---

### API 3 — Start Clip Upload

```http
POST /api/playback/start/{imei}
```

Requests the dashcam device to upload a specific `.ts` clip.

The frontend then polls until the uploaded clip becomes available.

---

# Timeline Logic

The timeline converts timestamps into:

```txt
timestamp → clip mapping
```

When a user clicks:

1. Timeline calculates clicked timestamp
2. Matching clip is identified
3. API 3 is triggered
4. Upload readiness polling begins
5. Playback starts from calculated offset

---

# Playback Queue Architecture

The system uses a DVR-style queue model.

Queue contains:

```txt
[current, next, buffered]
```

As soon as the current clip starts:

* next clip is prefetched
* upload readiness polling begins
* playback transition becomes smoother

This follows the architecture suggested in the assignment document. 

---

# Known Technical Challenges

## MPEG-TS (`.ts`) Browser Playback

The backend currently uploads raw `.ts` MPEG Transport Stream files.

Raw `.ts` playback support differs across browsers:

| Browser | Native `.ts` Support |
| ------- | -------------------- |
| Chrome  | Limited              |
| Edge    | Limited              |
| Safari  | Partial              |
| Firefox | Inconsistent         |

Because of this:

* some uploaded clips download correctly
* but fail to play natively in HTML5 video

---

# Playback Investigation Performed

The following approaches were investigated:

* Native HTML5 playback
* HLS.js integration
* MPEGTS.js integration
* Direct TS streaming
* Upload polling improvements
* Queue preloading
* Buffer management

---

# Backend/API Observations

During testing, the following backend/device-side behavior was observed:

* API 1 successfully queues TF card scan
* Session status changes:

  * `collecting`
  * `uploading`
* API 2 intermittently returns:

  * `videos: []`
  * `count: 0`
  * `parsedDataAvailable: false`
* `currentVideo` sometimes appears temporarily
* Uploaded `.ts` files become downloadable
* Final parsed inventory occasionally disappears again

This indicates the playback pipeline is highly asynchronous and may depend on:

* device upload timing
* TF card scan completion
* backend parsing finalization
* or session expiration

---

# Production Recommendation

A production-ready DVR playback system should ideally expose:

* `.m3u8` HLS playlists
* fragmented MP4 streams
* or server-side transcoding

instead of raw `.ts` uploads.

This would provide:

* smoother playback
* better browser compatibility
* lower buffering
* more reliable seeking

---

# Assignment Requirements Covered

Implemented features from the assignment specification include: 

* Clickable timeline
* Auto-play between clips
* Playback queue
* Timeline scrubber
* Loading states
* Clip polling
* API integration
* Playback controls
* Queue prefetching
* Timestamp parsing

---

# Test Credentials

|          |                                             |
| -------- | ------------------------------------------- |
| Platform | https://dashcam.okdriver.in                 |
| Login    | [demo@okdriver.in](mailto:demo@okdriver.in) |
| Password | 12345678                                    |
| Vehicle  | DL5CJ7355                                   |
| IMEI     | 864993060968006                             |
| API Base | http://smart.okdriver.in:5000               |

---

# Future Improvements

* True HLS playback support
* Dual-camera synchronized playback
* Better buffering strategy
* IndexedDB clip caching
* Timeline zoom levels
* Playback analytics
* Gap detection visualization
* MP4 transcoding support

---

# Author

Developed as part of the okDriver Full Stack Developer Assignment.
