var loadJson = function(url, callback) {
    var rq = new XMLHttpRequest();
    rq.onreadystatechange = function() {
        if (rq.readyState == 4) {
            if (rq.status == 200) {
                var rslt = JSON.parse(rq.responseText);
                callback(rslt);
            } else {
                callback({ err: "Failed, status: " + rq.status });
            }
        }
    };
    rq.onerror = function() {
        callback({ err: "Failed to load " + url });
    };
    rq.open("GET", url, true);
    rq.send();
};
