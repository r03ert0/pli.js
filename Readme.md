# grbl commands
https://benmaker.fr/2021/03/17/configuration-de-grbl-v1-1

# gcode reference
https://marlinfw.org/meta/gcode/

# notes

Method:

- Connect the PLI machine
- Start the server with `npm start`
- Connect the phone to the website: https://darcy.local:3000
- Connect the computer to the website
- Open the web console in the computer
- set the video device in the phone by sending a message through the web console. In my S21, the wide-angle camera, which is the best for close-ups, is device #4. Because the phone was the first client connected, it's client #0. So the command is `sendMessage({type:"set-device", clientIndex:0, deviceIndex: 4})`
- start the streaming in the phone: `sendMessage({type:"start-stream", clientIndex:0}')`
- set the zoom: `sendMessage({type:"zoom", clientIndex:0, value:3})`
- set the exposure: `sendMessage({type:"exposureTime", clientIndex:0, value: 50})`
- set the focus: `sendMessage({type:"focusDistance", clientIndex:0, value: 0.101})`
- take a photo: `sendMessage({type:"take-photo", clientIndex:0})`
- turn the motor. Positive values are smoother. A single step is `0.0025`, but is a very small turn. I've been using: `sendMessage({type:"turn", value: 0.1})`.

It may be interesting to vary the exposureTime setting. There are regions where signal is very high, and if exposure is not low enough, the image is just all white. However, there are some other regions with less signal where exposure has to be higher.

Changing the exposureTime setting resets the focusDistance setting. It would be nice to be able to set them all together, with an API like `sendMessage({clientIndex:0, exposureTime: 50, focusDistance: 0.101})`.

The API for `set-device` and `start-stream` could be combined, because I don't see a use case where one would like to set the device without willing to start it. The API could be `sendMessage({type:"start-stream", clientIndex:0, deviceIndex: 4}')`.

The way of indexing clients and devices in the server is buggy. If a client disconnects and connects back, it is likely to rewrite the entry of a previoius client. There should be a better way of identifying clients, remove them when they disconnect, and assign them in a stable way when they reconnect.