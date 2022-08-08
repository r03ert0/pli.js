// code from
// https://developers.google.com/web/updates/2016/12/imagecapture
// https://github.com/webrtc/samples/tree/gh-pages/src/content/devices/input-output

'use strict';

/*
  WebRTC
*/

const videoElement = document.querySelector('video');
let deviceInfos;
let videoDevice;
let imageCapture;
let mediaStreamTrack;
let serverDevices;

const applyConstraints = (constraints) => {
  if (typeof (mediaStreamTrack) === "undefined") {
    console.log("ERROR: No mediaStreamTrack defined");
    return;
  }

  mediaStreamTrack.applyConstraints(constraints)
    .then(console.log)
    .catch(console.log);
};

const doZoom = (value) => {
  const constraints = {
    advanced: [{
      zoom: value
    }]
  };
  applyConstraints(constraints);
};

const zoom = () => {
  const el = document.querySelector("#zoom");
  doZoom(el.value);
};

const doFocusDistance = (value) => {
  const constraints = {
    advanced: [{
      focusMode: "manual",
      focusDistance: value
    }]
  };
  applyConstraints(constraints);
};

const focusDistance = () => {
  const el = document.querySelector("#focusDistance");
  doFocusDistance(el.value);
};

const doExposureTime = (value) => {
  const constraints = {
    advanced: [{
      exposureMode: "manual",
      exposureTime: value
    }]
  };
  applyConstraints(constraints);
};

const exposureTime = () => {
  const el = document.querySelector("#exposureTime");
  doExposureTime(el.value);
};

const configureDevicesSelection = () => {
  for (const [deviceIndex, d] of deviceInfos.entries()) {
    const { kind, label } = d;

    if (kind === "videoinput") {
      document.querySelector("#devices").innerHTML += `
        <option value=${deviceIndex}>${label}</option>`;

      const c = d.getCapabilities();
      document.querySelector("#info").innerHTML += `
        <details>
          <summary>${label} ${c.width.max}x${c.height.max}</summary>
          <pre>
${JSON.stringify(c, "", 2)}
          </pre>
        </details>`;
    }
  }
};

const getBestDeviceIndex = () => {
  let bestDeviceIndex;
  let bestPixels = 0;

  for (const [deviceIndex, d] of deviceInfos.entries()) {
    const { kind, label } = d;
    if (kind === "videoinput") {
      const c = d.getCapabilities();
      const width = c.width.max;
      const height = c.height.max;
      const pixels = width * height;
      if (pixels > bestPixels) {
        bestDeviceIndex = deviceIndex;
        bestPixels = pixels;
      }
      console.log(label, c.width.max, c.height.max);
    }
  }

  // if it was not possible to select a video device based on pixels
  // just select the first one.
  if (!bestDeviceIndex) {
    bestDeviceIndex = deviceInfos.map((d) => d.kind === "videoinput")[0];
  }

  return bestDeviceIndex;
};

const doSelectDevice = (index) => {
  videoDevice = deviceInfos[index];
};

const configureStreamControls = () => {
  const capabilities = mediaStreamTrack.getCapabilities();
  const settings = mediaStreamTrack.getSettings();

  console.log({capabilities});
  console.log({settings});

  // set zoom
  if ("zoom" in settings) {
    const el = document.querySelector("#zoom");
    el.value = settings.zoom;
    el.min = capabilities.zoom.min;
    el.max = capabilities.zoom.max;
    el.step = capabilities.zoom.step;
  }

  // set focus
  if ("focusDistance" in settings) {
    const el = document.querySelector("#focusDistance");
    el.value = settings.focusDistance;
    el.min = capabilities.focusDistance.min;
    el.max = capabilities.focusDistance.max;
    el.step = capabilities.focusDistance.step;
  }

  // set exposure
  if ("exposureTime" in settings) {
    const el = document.querySelector("#exposureTime");
    el.value = settings.exposureTime;
    el.min = capabilities.exposureTime.min;
    el.max = capabilities.exposureTime.max;
    el.step = capabilities.exposureTime.step;
  }
};

const gotDevices = (deviceInfosObject) => {
  deviceInfos = deviceInfosObject; // a MediaDevices object

  // document.querySelector("#info").innerText += JSON.stringify(deviceInfos, "", 2);

  configureDevicesSelection();

  const bestDeviceIndex = getBestDeviceIndex();
  doSelectDevice(bestDeviceIndex);
}

const gotStream = (stream) => {
  window.stream = stream; // a MediaStream object
  videoElement.srcObject = stream;

  mediaStreamTrack = stream.getVideoTracks()[0]; // a MediaStreamTrack object

  configureStreamControls();

  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();
}

const handleError = (error) => {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

const startStream = () => {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }

  // const deviceIndex = document.querySelector("#devices").value;
  // const videoDevice = deviceInfos[deviceIndex];
  const videoSource = videoDevice.deviceId;
  const constraints = {
    video: { deviceId: videoSource ? { exact: videoSource } : undefined }
  };
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

const initWebRTC = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    gotDevices(devices);
  } catch(err) {
    handleError(err);
  };
}

/*
  Websocket
*/

let wss;

const postMessage = async (blob) => {
  const form = new FormData();
  form.append('image', blob);

  const response = await fetch("https://darcy.local:3000", {
    method: 'POST',
    body: form
  });
  console.log(await response.json());
}

const doTakePhoto = async () => {
  imageCapture = new ImageCapture(mediaStreamTrack);
  // imageCapture = new ImageCapture(window.stream.getVideoTracks()[0]);
  let blob;
  try {
    blob = await imageCapture.takePhoto();
    const img = document.querySelector('img');
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      // URL.revokeObjectURL(this.src);
      document.querySelector("#img-info").innerText = `${img.width} x ${img.height}`;
    }

    postMessage(blob);
  } catch (err) {
    console.error('takePhoto() error:', error);
  }
};

const turnLeft = () => {
  sendMessage({type: "turn", value: -0.1});
};

const turnRight = () => {
  sendMessage({type: "turn", value: 0.1});
};

const receivedWebsocketMessage = (event) => {
  console.log('Message from server:', event.data);

  const msg = JSON.parse(event.data);
  const innerHTML = document.querySelector('#info').innerHTML;

  if (msg.message) {
    document.querySelector('#info').innerHTML = `[msg] ${msg.message}<br/>${innerHTML}`;
  }

  if (msg.error) {
    document.querySelector('#info').innerHTML = `[msg] ${msg.error}<br/>${innerHTML}`;
  }

  if (msg.path) {
    const { path, manufacturer, serialNumber, locationId, vendorId, productId } = msg;
    document.querySelector('#info').innerHTML = `[msg] Arduino found:
        path ${path}
manufacturer ${manufacturer}
serialNumber ${serialNumber}
  locationId ${locationId}
    vendorId ${vendorId}
   productId ${productId}

${innerHTML}`;
  }

  if (msg.selectDevice) {
    doSelectDevice(msg.selectDevice);
  }

  if (msg.startStream) {
    startStream();
  };

  if (msg.zoom) {
    doZoom(msg.zoom);
  }

  if (msg.focusDistance) {
    doFocusDistance(msg.focusDistance);
  }

  if (msg.exposureTime) {
    doExposureTime(msg.exposureTime);
  }

  if (msg.takePhoto) {
    doTakePhoto();
  }

  if (msg.devices) {
    serverDevices = msg.devices;
  }
};

const sendMessage = (obj) => {
  wss.send(JSON.stringify(obj));
};

const sendDevices = () => {
  const myDeviceInfos = JSON.parse(JSON.stringify(deviceInfos));

  // add capabilities
  for (let i=0; i<deviceInfos.length; i++) {
    const { kind } = deviceInfos[i];

    if (kind === "videoinput") {
      myDeviceInfos[i].capabilities = deviceInfos[i].getCapabilities();
    }
  }
  
  sendMessage({
    type: "devices",
    deviceInfos: myDeviceInfos
  });

}

const initWebsocket = () => {
  const pr = new Promise((resolve, reject) => {
    wss = new WebSocket("wss://darcy.local:3000");

    // Listen for messages
    wss.addEventListener('message', receivedWebsocketMessage);  

    // Connection opened
    wss.addEventListener('open', () => {
      sendMessage({type: 'plijs-client'});
      resolve();
    });
  });

  return pr;
}

const main = async () => {
  await initWebRTC();
  await initWebsocket();

  sendDevices();

  console.log(deviceInfos);

  if (navigator.userAgent.includes("Mobile")) {
    document.querySelector("#camera").style.display = "block";
  } else {
    document.querySelector("#computer").style.display = "block";
  }
}

main();
