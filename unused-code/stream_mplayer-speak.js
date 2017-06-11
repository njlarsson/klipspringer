var child_process = require('child_process');
var fs = require('fs');
var proc_util = require('./proc_util');
var debug = require("./debug");
var speak = require("./speak");

exports.create = function(stream, device, probe) {
    var proc = null, paused = false;
    var quitters = 0;

    var mplayer = "mplayer";
    
    var options = {
	quiet: [ "-quiet" ],
	slave: [ "-slave" ],
        ao: [ "-ao", device ],
        vo: [ "-vo", "null" ],
        volume: [ "-volume", "100" ]
        // cache: [ "-cache", "2048" ],
        // cache_min: [ "-cache-min", "5" ]
    };

    var probeOptions = JSON.parse(JSON.stringify(options));
    probeOptions.ao = [ "-ao", "null" ];
    probeOptions.frames = [ "-frames", "0" ];

    var joinOptions = function(opts, f) {
        var args = [];
        for (opt in opts) { args = args.concat(opts[opt]); }
        args = args.concat(f);
        return args;
    };
    
    var intf = {};

    var title = null;

    var handleMplayerOutput = function(probeSpeak, callback) {
        var textbuf = '', endLine, icy;
        return function(buf) {
            debug(buf.toString(), 2);
            
            textbuf += buf.toString();
            while ((endLine = textbuf.indexOf('\n')) >= 0) {
                if (icy = textbuf.match(/^ICY *Info: *StreamTitle='(.*)'/)) {
                    title = icy[1];
                    if (probeSpeak) { speak(title, device, callback); }
                }
                textbuf = textbuf.slice(endLine+1);
            }
        };
    };

    var playStream = function(callback) {
        if (proc) { return; }
        proc = child_process.spawn(mplayer, joinOptions(options, stream));
        proc.stdout.on('data', handleMplayerOutput(false));
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
    };
    
    var probeSpeakPlayStream = function(callback) {
        var mpProc = child_process.spawn(mplayer, joinOptions(probeOptions, stream));
        mpProc.stdout.on('data', handleMplayerOutput(true, function() { playStream(callback); }));
        mpProc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
        mpProc.on('exit', function() { playStream(callback); });
    };
    
    intf.start = function(query, callback) {
        if (proc) {
            if (callback) { callback("Already started"); }
        } else {
            if (probe) { probeSpeakPlayStream(callback); }
            else       { playStream(callback); }
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

    var togglePause = function(pause) {
        return function(query, callback) {
	    if (!proc) {
                if (callback) { callback("Play process not active", false); }
            } else if (paused !== pause) {
	        proc.stdin.write("pause\n"); // toggle
	        paused = pause;
                if (callback) { callback(null, { ok: true }); }
	    } else {
                if (callback) { callback(null, { ok: true }); }
            }
        };
    };
    intf.pause = togglePause(true);
    intf.play = togglePause(false);

    intf.get_title = function(query, callback) {
        if      (!proc)  { callback("Play process not active"); }
        else if (!title) { callback("Title not set"); }
        else             { callback(null, { title: title }); }
    };
    
    return intf;
}
