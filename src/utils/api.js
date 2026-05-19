var BASE_URL    = "http://smart.okdriver.in:5000";
var BASE_URL_2  = "https://smart.okdriver.in";
var DEVICE_IMEI = "864993060968006";

// tells the device to scan its TF card and send back the file list
function requestVideoList(imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(BASE_URL + "/api/playback/request-list/" + imei, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ useTFCard: true }),
  }).then(function(r) { return r.json(); });
}

// gets the list of video files available on the device
function getVideoList(imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(BASE_URL_2 + "/api/playback/videos/" + imei)
    .then(function(r) { return r.json(); });
}

// tells the device to upload a specific clip so we can play it
function startClipPlayback(filename, imei) {
  imei = imei || DEVICE_IMEI;
  return fetch(BASE_URL + "/api/playback/start/" + imei, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      videoName: filename,
      protocol:  "http",
      force:     true,
    }),
  }).then(function(r) { return r.json(); });
}

// device uploads async so we keep checking until the file is ready
function waitForClip(videoUrl, onReady, onFail, onTick) {
  var tries   = 0;
  var maxTries = 30;
  var interval = 2000;

  function check() {
    tries++;
    if (onTick) onTick(tries, maxTries);

    fetch(videoUrl, { method: "HEAD" })
      .then(function(r) {
        if (r.ok) {
          onReady(videoUrl);
        } else if (tries < maxTries) {
          setTimeout(check, interval);
        } else {
          onFail();
        }
      })
      .catch(function() {
        if (tries < maxTries) setTimeout(check, interval);
        else onFail();
      });
  }

  check();
}

function getVideoUrl(filename) {
  return BASE_URL + "/api/playback/video-upload/" + filename;
}
