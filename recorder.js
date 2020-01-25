var fs = require('fs');
var child_process = require('child_process');
var numkeys = require('./numkeys');

var fno = 0;

var fnam = function(i) {
    return '/home/pi/recs/rec'+i+'.wav';
}
    
var speak = function(s) {
    return child_process.spawn('/usr/bin/espeak', [s]);
}

var setFnoFun = function(i, ch) {
    return function() {
        fno = i;
        speak(ch);
    }
}

var actions = {};
var rec = null, play = null;

(function() {
    var i, ch;

    for (i = 1; i < 10; i++) {
        ch = String.fromCharCode('0'.charCodeAt(0) + i);
        actions[ch] = setFnoFun(i, ch);
    }
}());

actions['\t'] = function() {
    fno++;
    speak(fno);
}

var startrec = function() {
    rec = child_process.spawn(
        '/usr/bin/rec',
        ['-c', '2',
         '-r', '44100',
         '-b', '24',
         '--buffer', '65536',
         '-q',
         fnam(fno)]);
    rec.stdout.on('data', function(buf) { speak(buf.toString()); });
    rec.stderr.on('data', function(buf) { speak("Error: "+buf.toString()); })
}

actions['+'] = function() {
    if (rec) rec.kill();
    startrec();
    speak("re-cording");
}
    
actions['-'] = function() {
    if (!rec) { return; }
    speak("stop");
    rec.kill();
    rec = null;
}

actions['\b'] = function() {
    speak("delete");
    fs.unlink(fnam(fno), function() {});
}

actions['*'] = function() {
    if (play) { play.kill(); }
    speak("play")
        .on('exit', function() {
            play = child_process.spawn('/usr/bin/play', [fnam(fno)]);
        });
}

actions['/'] = function() {
    if (!play) { return; }
    play.kill();
    play = null;
}

actions['.'] = function() {
    var durs = '', a, t = "", h, m, s;
    child_process.spawn('/usr/bin/soxi', ['-d', fnam(fno)])
        .on('exit', function() {
            a = durs.match(/(\d\d):(\d\d):(\d\d\.\d\d)/);
            if (!a) { t = "can't get duration"; }
            else {
                h = +a[1]; m = +a[2]; s = +a[3];
                if (h) { t = h + (h > 1 ? " hours, " : " hour, "); }
                if (t || m) { t += m + (m > 1 ? " minutes, " : " minute, "); }
                t += s + " seconds";
            }
            speak(t);
        }).stdout.on('data', function(buf) { durs += buf.toString(); });
}

var zerotime = 0;

actions['0'] = function(time) { zerotime = time; }
actions['\n'] = function(time) {
    if (time - zerotime < 0.5) {
        speak("shutting down")
            .on('exit', function() {
                child_process.spawn('/usr/bin/sudo', ['/sbin/shutdown', '-h', 'now']);
            });
    }
}

var devHandle = process.argv[2]; // Something like /dev/input/event0

var init = function() {
    if (fs.existsSync(devHandle)) {
        console.log("Setting up key actions");
        numkeys.setupKeyActions(devHandle, actions);
    } else {
        setTimeout(init, 3000);
    }
}

init();
