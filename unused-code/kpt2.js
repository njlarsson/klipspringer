var fs = require('fs');
var keypress = require('keypress');

var keyb = fs.createReadStream('/dev/input/event1');

// make `process.stdin` begin emitting "keypress" events 
keypress(keyb);
 
// listen for the "keypress" event 
keyb.on('keypress', function (ch, key) {
    console.log('got "keypress" ' + JSON.stringify(key, null, 4));
});
 
