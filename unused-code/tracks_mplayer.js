var child_process = require('child_process');
var fs = require('fs');
var proc_util = require('./proc_util');
var debug = require("./debug");

exports.create = function(playCwd, tracks, device) {
    var proc = null, paused = false, delayedCmds = [];

    var options = {
	quiet: [ "-quiet" ],
	slave: [ "-slave" ],
        ao: [ "-ao", device ],

        volume: [ "-volume", "100" ],
        scaletempo: [ "-af", "scaletempo" ],
        cache: [ "-cache", "49152" ],
        cache_min: [ "-cache-min", "5" ]
    };
    var mplayer = "mplayer";

    var intf = {};

    var args = [];
    for (opt in options) { args = args.concat(options[opt]); }
    args = args.concat(tracks);

    // Starts processes and starts playing. The callback, if non-null,
    // gets two arguments: the first is null or an error message; the
    // second is true if start took effect.
    intf.start = function(query, callback) {
        if (proc) {
            if (callback) { callback("Already started", false); }
        } else {
            debug(mplayer + " " + args.join(" "), 1);
            
            proc = child_process.spawn(mplayer, args, { cwd: playCwd });
            proc.stdout.on('data', function(buf) { debug(buf.toString(), 2); });
            proc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
            
            var exit = function (code) {
                if (proc) {
                    proc = null;
                    debug("mplayer terminated, status: " + code, 1);
                    if (intf.onExit) { intf.onExit((code ? "exit status: " + code : null), true); }
                }
            };
            proc.on('exit', exit);
            proc.on('close', exit);
            if (callback) { callback(null, true); }
        }
    };
    
    var command = function(cmd) {
	if (paused) { delayedCmds.push(cmd); }
	else        { proc.stdin.write(cmd); }
    };

    // Quits processes, unless done already. The callback, if
    // non-null, gets two arguments: the first is null or an error
    // message; the second is true if start took effect.
    intf.quit = function(query, callback) {
        if (proc) {
            if (callback) { intf.onExit = callback; } // override!
            proc.stdin.write("quit\n");
            proc_util.die(function() { return proc; },
                          [{ signal: 'SIGTERM', timeout: 3000 },
                           { signal: 'SIGKILL', timeout: 10000 }]);
        } else {
            if (callback) { callback(null, false); }
        }
    };

    var togglePause = function(pause) {
        return function(query, callback) {
	    if (!proc) {
                if (callback) { callback("Play process not active", false); }
            } else if (paused !== pause) {
	        proc.stdin.write("pause\n"); // toggle
	        paused = pause;
	        if (!paused) { for (var i = 0; i < delayedCmds.length; i += 1) { proc.stdin.write(delayedCmds[i]); } }
                if (callback) { callback(null, true); }
	    } else {
                if (callback) { callback(null, false); }
            }
        };
    };
    intf.pause = togglePause(true);
    intf.play = togglePause(false);

    var step = function(how) {
        return function(query, callback) {
	    if (!proc) {
                if (callback) { callback("Play process not active", false); }
            } else {
	        command("pt_step " + how + "\n");
                if (callback) { callback(null, true); }
            }
        };
    };
    intf.next_track = step("1");
    intf.prev_track = step("-1");

    return intf;
}
