var BASE_URL = "http://smart.okdriver.in:5000";
var DEVICE_IMEI = "864993060968006";

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

export function getVideoList(imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(BASE_URL + "/api/playback/videos/" + imei)
    .then(function(r) { return r.json(); });
}

export function startClipPlayback(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(
    BASE_URL + "/api/playback/start/" + imei,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoName: filename, protocol: "http", force: true })
    }
  ).then(function(r) { return r.json(); });
}

export function getVideoUrl(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return BASE_URL + "/api/playback/video/" + imei + "/" + filename;
}

export function getReadyUrl(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return BASE_URL + "/api/playback/ready/" + imei + "/" + filename;
}

// FIX: argument order was (filename, onReady, onFail, onTick, imei)
// but callers pass  (filename, imei, onReady, onFail, onTick)
// Unified to: waitForClip(filename, imei, onReady, onFail, onTick)
export function waitForClip(filename, imei, onReady, onFail, onTick) {
  imei = imei || DEVICE_IMEI;

  var tries    = 0;
  var maxTries = 90;
  var interval = 3000;

  var readyUrl = getReadyUrl(filename, imei);

  function check() {
    tries++;

    if (onTick) onTick(tries, maxTries);

    fetch(readyUrl + "?t=" + Date.now(), { method: "GET", cache: "no-store" })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        console.log("READY RESPONSE:", data);

        if (data && data.ready) {
          // FIX: prefer mp4Url from server (Chrome-compatible), fall back to .ts URL
          // FIX: removed 1500ms artificial delay — play immediately when ready
          var url = (data.mp4Url) ? data.mp4Url : getVideoUrl(filename, imei);
          onReady(url);
          return;
        }

        if (tries < maxTries) {
          setTimeout(check, interval);
        } else {
          onFail();
        }
      })
      .catch(function() {
        if (tries < maxTries) {
          setTimeout(check, interval);
        } else {
          onFail();
        }
      });
  }

  check();
}