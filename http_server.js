var http = require('http');
var url = require('url');
var fs = require('fs');
var timers = require('timers');
var debug = require("./debug");

exports.create = function() {
    var services = [];

    var srv = http.createServer(function (req, resp) {
	var servWrote = false;

        resp.passObj = function(obj1) {
            resp.writeHead(200, { 'Content-Type': "text/plain" });
            if (resp.expectsBody()) {
                var bod;
                if (typeof obj1 == 'function') { obj1(function(obj2) { resp.end(JSON.stringify(obj2)); }); }
                else                           {                       resp.end(JSON.stringify(obj1));     }
            } else {
                resp.end();
            }
        };
        resp.passText = function(type, text) {
            resp.writeHead(200, { 'Content-Type': "text/" + type });
            if (resp.expectsBody()) {
                if (typeof text == 'function') { text(function(htm2) { resp.end(htm2); }); }
                else                           {                       resp.end(text);     }
            } else {
                resp.end();
            }
        };
        resp.notFound = function(message) {
            resp.writeHead(404, { 'Content-Type': "text/plain" });
            resp.end(message || "Not found/applicable." );
        };
        resp.expectsBody = function() { return req.method == 'GET'; }

	debug("url: " + req.url, 3);
        var parsedUrl = url.parse(req.url, true);
        var service = services[parsedUrl.pathname.match(/^\/([^\/]+)?/)[1] || 'index.html'];
        if (service) { service(parsedUrl.pathname, parsedUrl.query, resp); }
        else         { resp.notFound("No service found for address."); }
    });

    srv.clientError = function(e) {
        var msg = e.toString();
        if (typeof e.bytesParsed !== 'undefined') { msg += ": " + e.bytesParsed; }
	if (e.code) { msg += ": " + e.code; }
        debug(msg, 0);
    }

    srv.addService = function(name, callback) {
	services[name] = callback;
	return srv;
    };

    srv.on('clientError', function(ex, sock) {
        if (sock.writable) { sock.write("HTTP/1.1 400 Bad Request\n\n"); }
        srv.clientError(ex);
    });

    return srv;
};
