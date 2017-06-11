var child_process = require('child_process');
var fs = require('fs');
var proc_util = require('./proc_util');
var debug = require("./debug");

exports.create = function(stream, device, charset) {
    var proc = null, paused = false;
    var quitters = 0;

    var options = {
	quiet: [ "-quiet" ],
	slave: [ "-slave" ],
        ao: [ "-ao", device ],
        volume: [ "-volume", "100" ]
        // cache: [ "-cache", "2048" ],
        // cache_min: [ "-cache-min", "5" ]
    };
    var mplayer = "mplayer";

    var intf = {};

    var args = [];
    for (opt in options) { args = args.concat(options[opt]); }
    args = args.concat(stream);

    var title = null;

    intf.start = function(query, callback) {
        var textbuf = '', endLine, m;
        if (proc) {
            if (callback) { callback("Already started"); }
        } else {
            debug(mplayer + " " + args.join(" "), 1);
            
            proc = child_process.spawn(mplayer, args);
            proc.stdout.on('data', function(buf) {
                debug(buf.toString(), 2);
                
                textbuf += buf.toString(charset);
                while ((endLine = textbuf.indexOf('\n')) >= 0) {
                    if (m = textbuf.match(/^ICY *Info: *StreamTitle='(.*)'/)) { title = m[1]; }
                    else if (m = textbuf.match(/^ Album: (.*)\n/)) { title = m[1]; }
                    textbuf = textbuf.slice(endLine+1);
                }
            });
            proc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
            proc.on('exit', function (code) {
                if (proc) {
                    proc = null;
                    debug("mplayer terminated, status: " + code, 1);
                    if (intf.onExit) { intf.onExit((code ? "exit status: " + code : null)); }
                    if (quitters) {
                        debug("quitters: " + quitters);
                        quitters = 0;
                    } else {
                        debug("spontaneous quit");
                        // intf.start(callback);
                    }
                }
            });
            if (callback) { callback(); }
        }
    };
    
    intf.quit = function(query, callback) {
        quitters += 1;
        if (proc) {
            proc.stdin.write("quit\n");
            if (callback) { callback(null, { ok: true }); }
            proc_util.die(function() { return proc; },
                          [{ signal: 'SIGTERM', timeout: 3000 },
                           { signal: 'SIGKILL', timeout: 10000 }]);
        } else {
            if (callback) { callback(); }
        }
    };

    var setPause = function(pause) {
        return function(query, callback) {
	    if (!proc) {
                if (callback) { callback("Play process not active", false); }
            } else if (pause === undefined || paused !== pause) {
	        proc.stdin.write("pause\n"); // toggle
	        paused = !paused;
                if (callback) { callback(null, { ok: true }); }
	    } else {
                if (callback) { callback(null, { ok: true }); }
            }
        };
    };
    intf.pause = setPause(true);
    intf.play = setPause(false);
    intf.toggle_pause = setPause();

    intf.get_title = function(query, callback) {
        if      (!proc)  { callback("Play process not active"); }
        else if (!title) { callback("Title not set"); }
        else             { callback(null, { title: title }); }
    };
    
    return intf;
}
