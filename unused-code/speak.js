var child_process = require('child_process');
var debug = require("./debug");

module.exports = exports = function(text, device, callback) {
    var mplayer = "mplayer";
    var args = ["-quiet", "-slave", "-ao", device, "-volume", "100", "-"];
    debug("SPEAK **************** "+mplayer + " " + args.join(" "), 1);

    var sProc = child_process.spawn("espeak", ["-vswedish", "--stdout", text]);
    sProc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
    sProc.on('exit', function() { mProc.stdin.end() });

    var mProc = child_process.spawn(mplayer, args);
    mProc.stdout.on('data', function(buf) { debug(buf.toString(), 2); });
    mProc.stderr.on('data', function(buf) { debug(buf.toString(), 2); });
    if (callback) { mProc.on('exit', callback); }

    sProc.stdout.on('data', function(buf) { mProc.stdin.write(buf); });
};
