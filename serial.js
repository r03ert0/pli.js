const SerialPort = require('serialport');
let port;
let commands;

const run = () => {
    console.log("exec:", commands[0]);
    port.write(commands[0] + '\r');
};

const square = () => {
    const gcode =
`$J=G21G91X-100F20`;
    commands = gcode.split('\n');
    console.log("Program:");
    console.log(commands); 
    run();
};

const turnLeft = () => {
    console.log('turn left');

    setTimeout(() => {
        square();
        setInterval(()=>{port.write('?\r');}, 200);
    } , 2000);
};

const turnRight = () => {
    console.log('turn right');
};

const connect = (path) => {
    port = new SerialPort(path, {
        baudRate: 115200
    });

    port.on('open', () => {
        console.log('Connection opened');
    });

    port.on('error', (err) => {
        console.log("ERROR:");
        console.log(err);
    });

    port.on('close', () => {
        console.log('Connection closed');
    });

    port.on('data', function (data) {
        const str = data.toString();
        // console.log(`[${str}]`);
        process.stdout.write(str);
        if(str === 'ok\r\n') {
            if (commands.length > 1) {
                commands.shift();
                run();
            }
        }
    });
    port.on('drain', () => {
        console.log('drain');
    });
};

SerialPort.list().then((list) => {
    console.log(list);
    const arduino = list.filter((d) => {
        return d.manufacturer && (
            d.manufacturer.match("Arduino") // arduino uno
            || d.manufacturer.match("FTDI") // arduino nano
        );
    });

    if (arduino.length) {
        console.log("Conecting to Arduino");
        console.log(arduino[0]);
        connect(arduino[0].path);
    } else {
        console.log("Arduino not found.");
    }
});

module.exports = {
    turnRight,
    turnLeft
};
