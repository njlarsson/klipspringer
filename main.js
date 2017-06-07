// Starts server. Arguments: /path/to/cd port device

var fs = require('fs');
var ip = require('ip');
var http_server = require('./http_server');
var macros = require('./macros');
var tracks_jplayer = require('./tracks_jplayer');
var stream_mplayer = require('./stream_mplayer');
var numkeys = require('./numkeys');
var debug = require('./debug');

var base = process.argv[2];
var port = process.argv[3];
var device = process.argv[4];
var cardPrefix = process.argv[5];
var classPath = process.argv[6];
var devHandle = process.argv[7]; // Something like /dev/input/event1

var cd = base + "/cd";

console.log('PID ' + process.pid);

var indexHtml = "sources.html";
var player = null;


var textFileService = function(fnam) {
    return function(path, query, resp) {
        var f = typeof fnam == 'function' ? fnam(path, query) : fnam;
        if (f.indexOf('/') >= 0) { resp.notFound("Not a plain file name: " + f); }

        var type = f.substring(f.lastIndexOf(".") + 1);
        if      (type == 'html') { }
        else if (type == 'css')  { }
        else if (type == 'js')   { type = 'javascript'; }
        else                     { resp.notFound("Unknown file type: " + type); }

        resp.passText(type, function(callback) {
            fs.readFile(f, { encoding: 'utf8' }, function(err, data) {
                macros.expand(data, query, callback);
            });
        });
    };
};

var exitPlayer = function() {
    indexHtml = "sources.html";
    player = null;
}

var playStream = function(channel, notice) {
    var stream = "http://http-live.sr.se/";
    if (channel == 'p1')       { stream += "p1-aac-192"; }
    else if (channel == 'p2')  { stream += "p2-aac-192"; }
    else if (channel == 'p2m') { stream += "p2musik-aac-192"; }
    else if (channel == 'p3')  { stream += "p3-aac-192"; }
    else                       { stream = null; }
    if (stream) {
        var start = function() {
            player = stream_mplayer.create(stream, device);
            player.onExit = exitPlayer;
            player.start(null, function(err, effective) {
                if (err) { notice.error(err); }
                else     { notice.ok(); }
            });
        };
        if (player) { player.onExit = start; player.quit(); }
        else        { start(); }
    } else {
        notice.err("Channel unavailable: " + query.channel);
    }
};

var srv = http_server.create();
srv.addService('index.html', textFileService(function(path, query) {
    return indexHtml;
})).addService('abs', textFileService(function(path, query) {
    return path.substring(5);
})).addService('cd_browse', textFileService(function(path, query) {
    return "cd_browse_" + (query.agent ? "albums" : "agents") + ".html";
})).addService('dir', function(path, query, resp) {
    resp.passObj(function(callback) {
        var f = query.agent ? cd + "/" + decodeURIComponent(query.agent) : cd;
        fs.readdir(f, function(err, files) {
            var val = {};
            if (err) { val.err = err.toString(); }
            else     { val.dir = files; }
            callback(val);
        });
    });
}).addService('launch', function(path, query, resp) {
    if (query.what == 'cd') {
        var albumDir = decodeURI(query.agent)+'/'+decodeURIComponent(query.album);
        fs.readdir(cd+'/'+albumDir, function(err, files) {
            if (err) {
                resp.passObj({ err: err.toString() });
            } else {
                files = files
                    .filter(function(fnam) { return /\.flac$/.test(fnam); })
                    .map(function(f) { return albumDir+'/'+f; });
                var start = function() {
                    player = tracks_jplayer.create(cd, classPath, files, cardPrefix);
                    player.onExit = exitPlayer;
                    player.start(null, function(err, effective) {
                        if (err) {                               resp.passObj({ err: err.toString() }); }
                        else     { indexHtml = "cd_player.html"; resp.passObj({ ok: true }); }
                    });
                };
                if (player) { player.onExit = start; player.quit(); }
                else        { start(); }
            }
        });
    } else if (query.what == 'sr') {
        playStream(query.channel, {
            ok:    function() { indexHtml = "radio_player.html"; resp.passObj({ ok: true }); },
            error: function(msg) { resp.passObj({ err: msg.toString() }); }
        });
    } else {
        resp.passObj({ err: "Unavailable to launch: " + query.what });
    }
}).addService('player', function(path, query, resp) {
    var f = player && player[query.cmd];
    if (f) {
        f(query, function(err, ans) {
            if (err) { resp.passObj({ err: err.toString() }) }
            else     { resp.passObj(ans); }
        });
    } else {
        resp.passObj({ err: "cmd not available: " + query.cmd });
    }
}).listen(port);
console.log("Server expects commands at http://" + ip.address() + ":" + port);


var radioButtonPlay = function(channel) {
    playStream(channel, {
        ok:    function() { debug("Playing radio "+channel, 1); },
        error: function(msg) { debug("Error playing radio "+channel+": "+msg.toString()); }
    });
};

if (devHandle) {
    numkeys.setupKeyActions(devHandle, {
        '1': function(time, code) { radioButtonPlay('p1'); },
        '2': function(time, code) { radioButtonPlay('p2'); },
        '3': function(time, code) { radioButtonPlay('p3'); },
        '4': function(time, code) { radioButtonPlay('p2m'); },
        '0': function(time, code) { if (player) { player.quit(); } }
    });
}
