// Starts server. Arguments: /path/to/cd port device

var fs = require('fs');
var http_server = require('./http_server');
var macros = require('./macros');
var tracks_mplayer = require('./tracks_mplayer');
var stream_mplayer = require('./stream_mplayer');
var remote = require('./remote.js');

var base = process.argv[2];
var port = process.argv[3];
var device = process.argv[4];
var ip = process.argv[5];
var mac = process.argv[6];

var remoteFs = remote.create(base, "cd", ip, mac);
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

var srv = http_server.create();
srv.addService('index.html', textFileService(function(path, query) {
    return indexHtml;
})).addService('abs', textFileService(function(path, query) {
    return path.substring(5);
})).addService('cd_browse', textFileService(function(path, query) {
    return "cd_browse_" + (query.agent ? "albums" : "agents") + ".html";
})).addService('dir', function(path, query, resp) {
    remoteFs.stat(ip, function(status) {
        if (status == 0) {      // ok, up
            resp.passObj(function(callback) {
                var f = query.agent ? cd + "/" + decodeURIComponent(query.agent) : cd;
                fs.readdir(f, function(err, files) {
                    var val = {};
                    if (err) { val.err = err; }
                    else     { val.dir = files; }
                    callback(val);
                });
            });
        } else {                // bring it up
            resp.passObj(remoteFs.wakeup(status));
        }
    });
}).addService('launch', function(path, query, resp) {
    if (query.what == 'cd') {
        remoteFs.stat(ip, function(status) {
            if (status == 0) {  // ok, up
                var cwd = cd + "/" + decodeURI(query.agent) + "/" + decodeURIComponent(query.album);
                fs.readdir(cwd, function(err, files) {
                    if (err) {
                        resp.passObj({ err: err });
                    } else {
                        files = files.filter(function(fnam) { return /\.flac$/.test(fnam); });
                        var start = function() {
                            player = tracks_mplayer.create(cwd, files, device);
                            player.onExit = exitPlayer;
                            player.start(function(err, effective) {
                                if (err) {                               resp.passObj({ err: err }); }
                                else     { indexHtml = "cd_player.html"; resp.passObj({ ok: true }); }
                            });
                        };
                        if (player) { player.quit(start); }
                        else        { start(); }
                    }
                });
            } else {            // bring it up
                resp.passObj(remoteFs.wakeup(status));
            }
        });
    } else if (query.what == 'sr') {
        var stream = "http://http-live.sr.se/";
        if (query.channel == "p1")       { stream += "p1-aac-192"; }
        else if (query.channel == "p2")  { stream += "p2-aac-192"; }
        else if (query.channel == "p2m") { stream += "p2musik-aac-192"; }
        else if (query.channel == "p3")  { stream += "p3-aac-192"; }
        else                             { stream = null; }
        if (stream) {
            player = stream_mplayer.create(stream, device);
            player.onExit = exitPlayer;
            player.start(function(err, effective) {
                if (err) {                                  resp.passObj({ err: err }); }
                else     { indexHtml = "radio_player.html"; resp.passObj({ ok: true }); }
            });
        } else {
            resp.passObj({ err: "Channel unavailable: " + query.channel });
        }
    } else {
        resp.passObj({ err: "Unavailable to launch: " + query.what });
    }
}).addService('player', function(path, query, resp) {
    var f = player && player[query.cmd];
    if (f) { f(); resp.passObj({ ok: true }); }
    else   {      resp.passObj({ err: "cmd not available: " + query.cmd }); }
}).listen(port);
