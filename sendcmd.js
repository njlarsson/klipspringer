var lastSendCmdTime = {};

var sendCmd = function(cmd, callback) {
    var now = Date.now();
    var last = lastSendCmdTime[cmd];
    var diffArg = last ? "&rept="+(now-last) : "";
    loadJson("/player?cmd=" + cmd + diffArg, callback || function(ans) {
        if (ans && ans.err) { console.error(ans.err); }
        lastSendCmdTime[cmd] = now;
    });
};
