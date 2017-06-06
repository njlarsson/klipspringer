var child_process = require('child_process');
var timers = require('timers');
var fs = require('fs');
var debug = require('./debug');

exports.create = function(mountDir, statFile, ip, mac) {
    var wakeonlanTimeEst = 45000;
    var mountTimeEst = 3000;
    var overtimeEst = 10000;
    var gaveupTime = 120000;
    var message = null;
    var eta = 0;

    var umountMount = function(afterMount) {
        // Before trying mount, do an umount, in case it's messed up.
	console.log("spawning umount");
        var umountp = child_process.spawn("sudo", ["umount", "-f", mountDir]);
        umountp.on('close', function(code) {
	    console.log("umounted: " + code);
	    console.log("spawning mount");
            var mountp = child_process.spawn("mount", [mountDir]);
            mountp.on('close', function(code) {
		console.log("mounted: " + code);
		afterMount(code);
	    });
        });
    };

    var mount = function() {
        umountMount(function(code) {
            if (code == 0) {
                message = null; // ok
            } else {
                // failed, probably tried just too early, try again
                message = "mount failed, trying again";
                debug(message);
                umountMount(function(code) {
                    if (code == 0) {
                        message = null; // ok
                    } else {
                        message = "mount failed on retry, status " + code;
                        debug(message);
                    }
                });
            }
        });
    };

    var wakeonlan = function() {
        var count = 0;
        debug("spawning wakeonlan " + mac, 2);
        child_process.spawn("wakeonlan", [mac]).on('close', function() { count += 1; });
        child_process.spawn("wakeonlan", [mac]).on('close', function() { count += 1; });
        child_process.spawn("wakeonlan", [mac]).on('close', function() { count += 1; });
        timers.setTimeout(
            function() {
                debug("wakeonlan count: " + count, 2);
                message = "Attempting mount";
                mount();
            },
            wakeonlanTimeEst);
    };

    var intf = {};

    // callback(status):
    // 0: ok
    // 1: needs mount
    // 2: needs wakeonlan
    // 3: wakeonlan or mount in progress
    intf.stat = function(ip, callback) {
        // callback(0);
        if (message) {
            callback(3);
        } else if (!ip) {
            callback(0);        // no ip means running locally, must be ok
        } else {
	    console.log("to ping");
            child_process.spawn("ping", ["-c", "1", "-w", "16", ip])
                .on('close', function(code) {
		    console.log("pinged " + code);
                    if (code == 0) {
                        fs.stat(mountDir + "/" + statFile, function(err, stats) {
                            callback(err ? 1 : 0);
                        });
                    } else {
                        callback(2);
                    }
                });
        }
    };

    intf.wakeup = function(fromStatus) {
        if (!message) {
            if (fromStatus == 2) {
                message = "Waking up Klipspringer";
                eta = Date.now() + wakeonlanTimeEst + mountTimeEst;
                wakeonlan();
            } else if (fromStatus == 1) {
                message = "Mounting fileserver";
                eta = Date.now() + mountTimeEst;
                mount();
            }
        }
        var remain = eta - Date.now();
        if (remain <= 0) { eta = Date.now() + overtimeEst; }
        return { eta: eta, message: message };
    }

    return intf;
};
