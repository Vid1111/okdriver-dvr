var BASE_URL = "http://smart.okdriver.in:5000";
var DEVICE_IMEI = "864993060968006";

// --------------------------------------------------
// REQUEST LIST
// --------------------------------------------------

function requestVideoList(imei) {
  imei = imei || DEVICE_IMEI;

  return fetch(
    BASE_URL +
      "/api/playback/request-list/" +
      imei,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        useTFCard: true,
      }),
    }
  ).then(function (r) {
    return r.json();
  });
}

// --------------------------------------------------
// GET VIDEO LIST
// --------------------------------------------------

function getVideoList(imei) {
  imei = imei || DEVICE_IMEI;

  return fetch(
    BASE_URL +
      "/api/playback/videos/" +
      imei
  ).then(function (r) {
    return r.json();
  });
}

// --------------------------------------------------
// START PLAYBACK
// --------------------------------------------------

function startClipPlayback(filename, imei) {
  imei = imei || DEVICE_IMEI;

  return fetch(
    BASE_URL +
      "/api/playback/start/" +
      imei,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        videoName: filename,
        protocol: "http",
        force: true,
      }),
    }
  ).then(function (r) {
    return r.json();
  });
}

// --------------------------------------------------
// VIDEO URL
// --------------------------------------------------

function getVideoUrl(filename, imei) {
  imei = imei || DEVICE_IMEI;

  return (
    BASE_URL +
    "/api/playback/video/" +
    imei +
    "/" +
    filename
  );
}

function getReadyUrl(filename, imei) {
  imei = imei || DEVICE_IMEI;

  return (
    BASE_URL +
    "/api/playback/ready/" +
    imei +
    "/" +
    filename
  );
}

// --------------------------------------------------
// WAIT FOR CLIP
// --------------------------------------------------

function waitForClip(
  filename,
  onReady,
  onFail,
  onTick,
  imei
) {
  imei = imei || DEVICE_IMEI;

  var tries = 0;

  var maxTries = 90;

  var interval = 3000;

  var readyUrl =
    getReadyUrl(
      filename,
      imei
    );

  function check() {
    tries++;

    if (onTick) {
      onTick(
        tries,
        maxTries
      );
    }

    fetch(
      readyUrl +
        "?t=" +
        Date.now(),
      {
        method: "GET",

        cache: "no-store",
      }
    )
      .then(function (r) {
        return r.json();
      })

      .then(function (data) {
        console.log(
          "READY RESPONSE:",
          data
        );

        if (
          data &&
          data.ready
        ) {
          onReady(
            getVideoUrl(
              filename,
              imei
            )
          );

          return;
        }

        if (
          tries < maxTries
        ) {
          setTimeout(
            check,
            interval
          );
        } else {
          onFail();
        }
      })

      .catch(function () {
        if (
          tries < maxTries
        ) {
          setTimeout(
            check,
            interval
          );
        } else {
          onFail();
        }
      });
  }

  check();
}