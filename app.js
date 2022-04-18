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

const receivedWebsocketMessage = (data) => {
  console.log('received: %s', data);
  switch(data) {
    case 'turn-left':
      serial.turnLeft();
      break;
    case 'turn-right':
      serial.turnRight();
      break;
  }
};

const connection = (ws) => {
  ws.on('message', receivedWebsocketMessage);
  ws.send('plijs-server');
};

const wss = new WebSocketServer({ server: httpsServer });
wss.on('connection', connection);

httpsServer.listen(port, () => {
    console.log(`HTTPS Server running on port ${port}`);
});