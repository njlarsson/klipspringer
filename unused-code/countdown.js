var countdown = function(deadline, show, action) {
    var countdownNode = document.createTextNode("?");
    var retry = document.createElement('a');
    retry.setAttribute('href', window.location.href);
    retry.appendChild(document.createTextNode("Retry"));
    console.log("show: " + show);
    show.appendChild(document.createElement('br'));
    show.appendChild(retry);
    show.appendChild(document.createTextNode("ing in "));
    show.appendChild(countdownNode);
    show.appendChild(document.createTextNode(" seconds"));
    
    var updateCounter = function() {
        var remain = deadline - Date.now();
        if (remain > 0) {
            countdownNode.data = Math.round(remain/1000);
            setTimeout(updateCounter, Math.min(remain, 1000));
        } else {
            action();
        }
    };

    updateCounter();
};
