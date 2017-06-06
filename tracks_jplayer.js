var child_process = require('child_process');
var fs = require('fs');
var proc_util = require('./proc_util');
var debug = require("./debug");

exports.create = function(playCwd, classPath, tracks, device) {
    var proc = null, paused = false, delayedCmds = [];

    var jplayer = "net.avadeaux.klipspringer.TrackPlayer";

    var intf = {};

    var args = ['-cp', classPath, '-Xmx200m', jplayer, device, '393216', '0.1'].concat(tracks);

    var ansBuf = "";
    var ansCallbackQueue = [];

    intf.start = function(query, callback) {
        if (proc) {
            if (callback) { callback("Already started"); }
        } else {
            proc = child_process.spawn('java', args, { cwd: playCwd });
            proc.stdout.on('data', function(buf) {
                ansBuf += buf.toString();
                var endAns = ansBuf.indexOf('\n\n');
                if (endAns >= 0) {
                    ansCallback = ansCallbackQueue.shift();
                    if (ansCallback) { ansCallback(ansBuf.slice(0, endAns+1)); }
                    else             { debug(ansBuf.slice(0, endAns)+'\n', 2); }
                    ansBuf = ansBuf.slice(endAns+2);
                }
            });
            proc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
            
            proc.on('exit', function (code) {
                if (proc) {
                    proc = null;
                    debug("track player terminated, status: " + code, 1);
                    if (intf.onExit) {
                        if (code) { intf.onExit("exit status: " + code); }
                        else      { intf.onExit(null, { ok: true }); }
                    }
                }
            });
            if (callback) { callback(null, { ok: true }); }
        }
    };
    
    var command = function(cmd) {
	if (paused) { delayedCmds.push(cmd); }
	else        { proc.stdin.write(cmd); }
    };

    intf.quit = function(query, callback) {
        if (proc) {
            proc.stdin.write("quit\n");
            callback(null, { ok: true });
            proc_util.die(function() { return proc; },
                          [{ signal: 'SIGTERM', timeout: 3000 },
                           { signal: 'SIGKILL', timeout: 10000 }]);
        } else {
            if (callback) { callback("Play process not active"); }
        }
    };

    var setPause = function(pause) {
        return function(query, callback) {
            var toggled;
	    if (!proc) {
                if (callback) { callback("Play process not active"); }
            } else {
	        proc.stdin.write("pause "+pause+"\n"); // toggle
	        paused = pause;
	        if (!paused) { for (var i = 0; i < delayedCmds.length; i += 1) { proc.stdin.write(delayedCmds[i]); } }
                if (callback) { callback(null, { ok: true }); }
	    }
        };
    };
    intf.pause = setPause(true);
    intf.play = setPause(false);

    var skip = function(how) {
        return function(query, callback) {
            var rept = query.rept, steps;
	    if (!proc) {
                if (callback) { callback("Play process not active"); }
            } else {
                steps = (how < 0 && !(rept < 1000)) ? how + 1 : how;
	        command("skip " + steps + "\n");
                if (callback) { callback(null, { ok: true }); }
            }
        };
    };
    intf.next_track = skip(1);
    intf.prev_track = skip(-1);

    var ansHandler = function(callback) {
        return function(ansString) {
            var ans = {}, exp = /ANS_([A-Z_]+)='([^']*)'\n/g, parts;
            while ((parts = exp.exec(ansString)) !== null) {
                ans[parts[1].toLowerCase()] = parts[2];
            }
            callback(null, ans);
        };
    };
    
    intf.get_track = function(query, callback) {
        if (!proc) {
            if (callback) { callback("Play process not active"); }
        } else {
            ansCallbackQueue.push(ansHandler(callback));
            command("get_filename\n");
        }
    };

    return intf;
}
