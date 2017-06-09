var child_process = require('child_process');
var fs = require('fs');
var proc_util = require('./proc_util');
var debug = require("./debug");

exports.create = function(stream, device) {
    var proc = null;
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

    var title = "";

    intf.start = function(query, callback) {
        var textbuf = '', endLine, icy;
        if (proc) {
            if (callback) { callback("Already started"); }
        } else {
            debug(mplayer + " " + args.join(" "), 1);
            
            proc = child_process.spawn(mplayer, args);
            proc.stdout.on('data', function(buf) {
                debug(buf.toString(), 2);
                
                textbuf += buf.toString();
                while ((endLine = textbuf.indexOf('\n')) >= 0) {
                    if ((icy = textbuf.match(/^ICY *Info: *StreamTitle='(.*)'/)) !== null) { title = icy[1]; }
                    textbuf = textbuf.slice(endLine+1);
                }
            });
            proc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
            
            var exit = function (code) {
                if (proc) {
                    proc = null;
                    debug("mplayer terminated, status: " + code, 1);
                    if (intf.onExit) { intf.onExit((code ? "exit status: " + code : null)); }
                    if (quitters) {
                        debug("quitters: " + quitters);
                        quitters = 0;
                    } else {
                        debug("spontaneous quit, restart");
                        intf.start(callback);
                    }
                }
            };
            proc.on('exit', exit);
            proc.on('close', exit);
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

    intf.get_title = function(query, callback) {
        console.log("getting "+title);
        if      (!proc)        { callback("Play process not active"); }
        else if (title === '') { callback("Title not set"); }
        else                   { callback(null, { title: title }); }
    };
    
    return intf;
}
