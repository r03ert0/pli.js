const https = require('https');
const fs = require('fs');
const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/', });
const cors = require('cors');
const WebSocketServer = require('ws').WebSocketServer;
const serial = require("./serial.js");

const app = express();
const port = 3000;

const httpsServer = https.createServer({
    key: fs.readFileSync('./public/key.pem'),
    cert: fs.readFileSync('./public/cert.pem'),
  }, app);

app.use(express.static('public'));
app.use(express.json());

app.use(cors());

app.get('/', (req, res) => {
  console.log("GET");
  res.send('Hello World!');
});

app.post('/', upload.single('image'), (req, res) => {
  console.log("POST");
  console.log(req.file, req.body)
  const {mimetype, destination, path} = req.file;
  const ext = mimetype.replace("image/", "");
  const newName = `${Number(new Date())}.${ext}`;
  fs.renameSync(`${path}`, `${destination}${newName}`);
  res.send({msg: 'Got your POST request'});
});

/* websocket */

const sendMessage = (clientWS, msg) => {
  clientWS.send(JSON.stringify(msg));
};

const clientIndexFromWS = (clientWS) => {
  let i = 0, index = -1;
  wss.clients.forEach((client) => {
    if (client === clientWS) {
      index = i;
    }
    i++;
  });
  return index;
};

const clientWSFromIndex = (clientIndex) => {
  let i = 0;
  let ws;
  wss.clients.forEach((client) => {
    if (i === clientIndex) {
      ws = client;
    }
    i++;
  });
  return ws;
};

const clientDevices = [];
const storeDevices = (deviceInfos, clientWS) => {
  console.log("storeDevices");
  const ci = clientIndexFromWS(clientWS);
  clientDevices[ci] = deviceInfos;
};

const sendDevices = (clientWS) => {
  sendMessage(clientWS, {
    devices: clientDevices
  });
};

const setClientDevice = ({clientIndex, deviceIndex}) => {
  const ws = clientWSFromIndex(clientIndex);
  sendMessage(ws, {
    selectDevice: deviceIndex
  });
};

const startClientStream = ({clientIndex}) => {
  const ws = clientWSFromIndex(clientIndex);
  sendMessage(ws, { startStream: true });
};

const takePhoto = ({clientIndex}) => {
  const ws = clientWSFromIndex(clientIndex);
  sendMessage(ws, { takePhoto: true });
};

const zoom = ({clientIndex, value}) => {
  const ws = clientWSFromIndex(clientIndex);
  sendMessage(ws, { zoom: value });
};

const focusDistance = ({clientIndex, value}) => {
  const ws = clientWSFromIndex(clientIndex);
  sendMessage(ws, { focusDistance: value });
};

const exposureTime = ({clientIndex, value}) => {
  const ws = clientWSFromIndex(clientIndex);
  sendMessage(ws, { exposureTime: value });
};

const receivedWebsocketMessage = (data, clientWS) => {
  console.log('received ws message: %s', data);

  const msg = JSON.parse(data);

  switch(msg.type) {
    case 'turn': // turns the pli polarisers by the amount in `value`
      serial.turn(msg);
      break;
    case 'devices': // client is sending its devices
      storeDevices(msg.deviceInfos, clientWS);
      break;
    case 'get-devices': // client requests the full list of available devices
      sendDevices(clientWS);
      break;
    case 'set-device': // client wants to set device. Server answers with device capabilities
      setClientDevice(msg);
      break;
    case 'start-stream': // clients wants to start a stream
      startClientStream(msg);
      break;
    case 'take-photo': // client wants device to take a photo
      takePhoto(msg);
      break;
    case 'zoom': // client wants device to change zoom
      zoom(msg);
      break;
    case 'focusDistance': // client wants device to change focusDistance
      focusDistance(msg);
      break;
    case 'exposureTime': // client wants device to change exposureTime
      exposureTime(msg);
      break;
  }
};

const connection = (ws) => {
  ws.send(JSON.stringify({message: 'plijs-server'}));
  ws.on('message', (data) => {
    receivedWebsocketMessage(data, ws);
  });
};

const wss = new WebSocketServer({ server: httpsServer });
wss.on('connection', connection);

serial.initArduino((data) => {
  console.log("Arduino:", data);
});


/* start server */

httpsServer.listen(port, () => {
    console.log(`HTTPS Server running on port ${port}`);
});