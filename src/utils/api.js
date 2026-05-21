// api.js
// All HTTP calls to the okDriver backend live here.
// I'm keeping the API layer separate from the components so if the base URL
// or auth headers ever change, there's only one place to update.

var BASE_URL = "http://smart.okdriver.in:5000";
var DEVICE_IMEI = "864993060968006";

// requestVideoList()
// Triggers API 1 — tells the device to wake up and scan its TF card.
// The device does this asynchronously, so this call just queues the command.
// After this, you need to poll getVideoList() until clips show up.
export function requestVideoList(imei, daysBack) {
  daysBack = daysBack || 30;
  return fetch(
    BASE_URL + "/api/playback/request-list/" + imei,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daysBack: daysBack })
    }
  ).then(function(r) { return r.json(); });
}

// getVideoList()
// Calls API 2 — fetches the list of .ts filenames the device has already
// reported. Will return an empty array if the device hasn't finished scanning yet.
export function getVideoList(imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(BASE_URL + "/api/playback/videos/" + imei)
    .then(function(r) { return r.json(); });
}

// startClipPlayback()
// Calls API 3 — asks the device to upload a specific clip so we can stream it.
// The device receives an UPLOAD + HVIDEO command and starts uploading via HTTP POST.
// This is async too — we have to poll the ready endpoint after this.
export function startClipPlayback(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(
    BASE_URL + "/api/playback/start/" + imei,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // force: true re-uploads even if the file was previously uploaded —
      // important for clips that might have been cleared from the server cache
      body: JSON.stringify({ videoName: filename, protocol: "http", force: true })
    }
  ).then(function(r) { return r.json(); });
}

// getVideoUrl()
// Builds the direct streaming URL for a clip once it's uploaded.
export function getVideoUrl(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return BASE_URL + "/api/playback/video/" + imei + "/" + filename;
}

// getReadyUrl()
// Builds the polling endpoint URL we hit to check if a clip has finished uploading.
export function getReadyUrl(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return BASE_URL + "/api/playback/ready/" + imei + "/" + filename;
}

// waitForClip()
// Polls the ready endpoint every 3 seconds until the clip is available or we give up.
// This is needed because the device uploads clips asynchronously after API 3 is called.
//
// Arguments:
//   filename  - the .ts filename to wait for
//   imei      - device identifier
//   onReady   - called with the playable URL once the clip is ready
//   onFail    - called if we exhaust all retries
//   onTick    - optional callback with (currentTry, maxTries) for showing progress to the user
export function waitForClip(filename, imei, onReady, onFail, onTick) {
  imei = imei || DEVICE_IMEI;

  var tries    = 0;
  var maxTries = 90;   // ~4.5 minutes total wait time
  var interval = 3000; // poll every 3 seconds

  var readyUrl = getReadyUrl(filename, imei);

  function check() {
    tries++;

    if (onTick) onTick(tries, maxTries);

    // Add a cache-busting param so we don't get a stale cached response
    fetch(readyUrl + "?t=" + Date.now(), { method: "GET", cache: "no-store" })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        console.log("READY CHECK:", filename, data);

        if (data && data.ready) {
          // Prefer an mp4 URL if the server provides one (better browser support),
          // otherwise fall back to the raw .ts stream
          var url = data.mp4Url ? data.mp4Url : getVideoUrl(filename, imei);
          onReady(url);
          return;
        }

        // Not ready yet — try again after the interval
        if (tries < maxTries) {
          setTimeout(check, interval);
        } else {
          onFail();
        }
      })
      .catch(function() {
        // Network error — don't give up immediately, just try again
        if (tries < maxTries) {
          setTimeout(check, interval);
        } else {
          onFail();
        }
      });
  }

  check();
}
