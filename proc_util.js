var timers = require('timers');
var debug = require('./debug');

// Gets function that splits/combines chunks into lines, and calls
// another function for them.
exports.streamliner = function(lineCallback, state) {
    var buf = ""
    return function (chunk) {
        var pos = 0;
        buf += chunk;
        pattern = /\n*(.+)?\n+/g;
        var match = true;
        while (match) {
            match = pattern.exec(buf);
            if (match) {
                lineCallback(match[1], state);
                pos = pattern.lastIndex;
            }
        }
        if (pos > 0) { buf = buf.substring(pattern.lastIndex); }
        else         { buf = ""; }
    };
};

// Gets process from given callback, and send signals specified by
// list (array). For list element elt:
//     elt.signal:    Signal to send, e.g. 'SIGTERM', 'SIGKILL'.
//     elt.timeout:   Time to wait (since previous) before sending.
exports.die = function(procCallback, signalTimeoutList) {
    var i = -1;

    var onTimeout = function() {
        var proc = procCallback();
        if (proc) {
            if (i >= 0) {
                debug("Emitting " + signalTimeoutList[i].signal, 1);
                proc.kill(signalTimeoutList[i].signal);
            }
            i += 1;
            if (i < signalTimeoutList.length) {
                timers.setTimeout(onTimeout, signalTimeoutList[i].timeout);
            }
        }
    };
    onTimeout();
};
