// code from
// https://developers.google.com/web/updates/2016/12/imagecapture
// https://github.com/webrtc/samples/tree/gh-pages/src/content/devices/input-output

'use strict';

const videoElement = document.querySelector('video');
let deviceInfos;
let videoDevice;
let imageCapture;
let wss;

const gotDevices = (deviceInfosObject) => {
    deviceInfos = deviceInfosObject; // a MediaDevices object

    document.querySelector("#info").innerText = JSON.stringify(deviceInfos, "", 2);

    let i = 0;
    let bestPixels = 0;
    for(const [,d] of deviceInfos.entries()) {
        if (d.kind === "videoinput") {
            const c = d.getCapabilities();
            document.querySelector("#info").innerText += `
Video device ${++i}:
${JSON.stringify(c, "", 2)}
`;
            if (c.width && c.height) {
                const width = c.width.max;
                const height = c.height.max;
                const pixels = width*height;
                if(pixels > bestPixels) {
                    videoDevice = d;
                    bestPixels = pixels;
                }
            }
        }
    }

    // if it wasn't possible to select a video device based on pixels
    // just take the first one
    if (!videoDevice) {
      videoDevice = deviceInfos.map((d)=>d.kind==="videoinput")[0];
    }
}

const gotStream = (stream) => {
    window.stream = stream; // a MediaStream object
    videoElement.srcObject = stream;

    const mediaStreamTrack = stream.getVideoTracks()[0]; // a MediaStreamTrack object
    const capabilities = mediaStreamTrack.getCapabilities();
    const settings = mediaStreamTrack.getSettings();
    console.log(capabilities);
    console.log(settings);

    // Refresh button list in case labels have become available
    return navigator.mediaDevices.enumerateDevices();
}

const handleError = (error) => {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

const start = () => {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const videoSource = videoDevice.deviceId;
  const constraints = {
    video: {deviceId: videoSource ? {exact: videoSource} : undefined}
  };
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
}

const postMessage = async (blob) => {
  const form = new FormData();
  form.append('image', blob);

  const response = await fetch("https://192.168.1.14:3000", {
    method: 'POST',
    // headers: {
    //   'Content-Type': 'multipart/form-data', // 'application/json'
    //   // 'Content-Type': 'application/x-www-form-urlencoded',
    // },
    body: form
  });
  console.log(await response.json());
}

const takePhoto = async () => {
    imageCapture = new ImageCapture(window.stream.getVideoTracks()[0]);
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
  wss.send("turn-left");
};

const turnRight = () => {
  wss.send("turn-right");
};

const receivedWebsocketMessage = (event) => {
  console.log('Message from server ', event.data);
};

const initWebsocket = () => {
  wss = new WebSocket("wss://localhost:3000");

  // Connection opened
  wss.addEventListener('open', () => {
    wss.send('plijs-client');
  });

  // Listen for messages
  wss.addEventListener('message', receivedWebsocketMessage);
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

initWebsocket();
