var fs = require('fs');
console.log("Starting");

var jsonFile = fs.readFileSync("config.json");
var jsonObj = JSON.parse(jsonFile);

console.log("Hostname: ", jsonObj.Network.Hostname);
console.log("Relay 1 Name: ", jsonObj.Relay.Relay1.Name);
