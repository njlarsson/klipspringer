var fs = require('fs');
var child_process = require('child_process');
var numkeys = require('./numkeys');

var fno = 0;

var setFnoFun = function(i, ch) {
    return function() {
        fno = i;
        child_process.spawn('/usr/bin/espeak', [ch]);
    }
}

var actions = {};
var rec = null, play = null;

(function() {
    var i, ch;

    for (i = 0; i < 10; i++) {
        ch = String.fromCharCode('0'.charCodeAt(0) + i);
        actions[ch] = setFnoFun(i, ch);
    }
}());

actions['+'] = function() {
    child_process.spawn('/usr/bin/espeak', ["re-cord"]);
    if (rec) { rec.kill(); }
    rec = child_process.spawn(
        '/usr/bin/rec',
        ['-c', '2',
         '-r', '44100',
         '-b', '24',
         '--buffer', '65536',
         '-q',
         'rec'+fno+'.wav']);
}
    
actions['-'] = function() {
    if (!rec) { return; }
    child_process.spawn('/usr/bin/espeak', ["stop"]);
    rec.kill();
    rec = null;
}

actions['\b'] = function() {
    child_process.spawn('/usr/bin/espeak', ["delete"]);
    fs.unlink('rec'+fno+'.wav', function() {});
}

actions['*'] = function() {
    if (play) { play.kill(); }
    child_process.spawn('/usr/bin/espeak', ["play"])
        .on('exit', function() {
            play = child_process.spawn('/usr/bin/play', ['rec'+fno+'.wav']);
        });
}

actions['/'] = function() {
    if (!play) { return; }
    play.kill();
    play = null;
}

actions['.'] = function() {
    var durs = '', a, t = "", h, m, s;
    child_process.spawn('/usr/bin/soxi', ['-d', 'rec'+fno+'.wav']);
        .on('exit', function() {
            a = durs.match(/(\d\d):(\d\d):(\d\d\.\d\d)/);
            if (!a) { t = "can't get duration"; }
            else {
                h = +a[1]; m = +a[2]; s = +a[3];
                if (h) { t = h + (h > 1 ? " hours, " : " hour, "); }
                if (t || m) { t += m + (m > 1 ? " minutes, " : " minute, "); }
                t += s + " seconds";
            }
        console.log(t);
        })
    .stdout.on('data', function(buf) { durs += buf.toString(); });
    child_process.spawn('/usr/bin/espeak', [t]);
}

var devHandle = process.argv[2]; // Something like /dev/input/event0

var init = function() {
    if (fs.existsSync(devHandle)) {
        numkeys.setupKeyActions(devHandle, actions);
    } else {
        setTimeout(init, 3000);
    }
}

init();
