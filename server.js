//Dependancies
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
//var ip = require('ip');
var gpio = require('onoff').Gpio;
//var network = require('network-config');

//GPIO Stuff
var onOff1 = new Gpio(26, 'out');

//Express Server Stuff
var app = express();
var port = process.env.PORT = 8080;
app.listen(port, () => {
    console.log('Server is running at:', port);
});

//Read in Config File
var config = fs.readFileSync("config.json");
var settings = JSON.parse(config);

//Create Relay States Object
var relayStates = {
    "Relay1": {
        "Power": "Off",
        "Name": "Relay 1"
    },
    "Relay2": {
        "Power": "Off",
        "Name": "Relay 2"
    },
    "Relay3": {
        "Power": "Off",
        "Name": "Relay 3"
    },
    "Relay4": {
        "Power": "Off",
        "Name": "Relay 4"
    }
}

//Create Charge Controller States Object
var solarState = {
    "FirmwareVersion": "0",
    "Solar": {
        "Voltage": "0",
        "Watts": "0",
        "ChargeState": "N/A",
        "MPPT": "N/A"
    },
    "Battery": {
        "Voltage": "0",
        "Current": "0"
    },
    "Load": {
        "Current": "0",
        "Power": "Off"
    }
}


//Serve Static HTML/CSS Resources from "Public" Folder
app.use(express.static('public', {
    index: "index.htm"
}));


//------Requests for things other than static resources---------//
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

app.get('/update', function (req, res) {
    //Call "Check Status" function to get current state from MPPT
    //then send status update as JSON
    res.send(relayStates);
});

app.get('/relaySettings', function (req, res) {
    res.send(settings);
})

app.post('/networkUpdate', function (req, res) {
    settings.Network.Hostname = req.body.Hostname;
    settings.Network.IP.Type = req.body.Type;
    settings.Network.IP.Address = req.body.Address;
    settings.Network.IP.Port = req.body.Port;
    settings.Network.IP.SubnetMask = req.body.SubnetMask;
    settings.Network.IP.DefaultGateway = req.body.DefaultGateway;
    var test = JSON.stringify(settings, null, 2);
    console.log(test);
    fs.writeFileSync('./newConfig.json', test);
    res.send("Success");
});

app.post('/relaySettingsUpdate', function (req, res) {
    settings.Relay.CycleDelay = req.body.cycleDelay * 1000;

    for (var i = 1; i < 5; i++) {
        var relay = "Relay" + i;
        var rName = "R" + i + "Name";
        var rTimeOn = "R" + i + "TimeOn";
        var rTimeOff = "R" + i + "TimeOff";
        var rTempLow = "R" + i + "TempLow";
        var rTempHigh = "R" + i + "TempHigh";
        var rBattVLow = "R" + i + "BattVoltageLow";
        var rBattVHigh = "R" + i + "BattVoltageLow";
        settings.Relay[relay].Name = req.body[rName];
        settings.Relay[relay].Time.On = req.body[rTimeOn];
        settings.Relay[relay].Time.Off = req.body[rTimeOff];
        settings.Relay[relay].Temp.Low = req.body[rTempLow];
        settings.Relay[relay].Temp.High = req.body[rTempHigh];
        settings.Relay[relay].BattVoltage.Low = req.body[rBattVLow];
        settings.Relay[relay].BattVoltage.High = req.body[rBattVHigh];
    }

    var test = JSON.stringify(settings, null, 2);
    console.log(test);
    fs.writeFileSync('./config.json', test);
    res.send("Relay Settings Updated Successfully");
    updateRelayNames();
});

app.post('/command', function (req, res) {
    var action = req.body.Action;
    var relay = req.body.Relay;

    if (action === "Cycle") {
        toggleRelay(relay);
        console.log("Relay Cycled. Will Toggle Again after " + settings.Relay.CycleDelay / 1000 + " seconds");
        setTimeout(toggleRelay, settings.Relay.CycleDelay, relay);
    } else if (action === "Toggle") {
        toggleRelay(relay);
    }
    res.send(relayStates);
    relayTimeController();
});


function toggleRelay(relay) {
    if (relayStates[relay].Power === "Off") {
        relayStates[relay].Power = "On";
        onOff1.writeSync(1);
    } else {
        relayStates[relay].Power = "Off";
        onOff1.writeSync(0);
    }
}

function updateRelayNames() {
    for (var i = 1; i < 5; i++) {
        var relay = "Relay" + i;
        relayStates[relay].Name = settings.Relay[relay].Name;
    }
}

function checkTime(on, off, now) {
    var state;
    if (off === on) {
        state = 1;
    } else if (on < off) {
        if (on <= now && now < off) {
            state = 1;
        } else {
            state = 0;
        }
    } else if (on > off) {
        if (on <= now && now > off) {
            state = 1;
        } else {
            state = 0;
        }
    }
    return state;
}

function relayTimeController() {
    var now = new Date
    var hours = now.getHours();
    var minutes = now.getMinutes();
    now = hours + ":" + minutes;
    var on = settings.Relay.Relay1.Time.On;
    var off = settings.Relay.Relay1.Time.Off;
    var state = checkTime(on, off, now);
    console.log("Relay State: " + state);
}

function checkIP() {
    return ip.address();
}


//









///
