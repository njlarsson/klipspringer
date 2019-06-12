// sync-cd-dirs.js
// Jesper Larsson
//
// Emits a bash script to update a slave directory to mirror a master
// directory. Run with:
//
//    node sync-cd-dirs.js masterdir slavedir
//
// Assumes a file hierarchy where every track is:
//
//    base/agent/album/track
//
// where base is the master/slave dir, agent is supposed to be artist, composer,
// label or whatever, album is an album and track is an ordinary file.
//
// Optionally, each album may also contain a directory for other associated
// data, which is expected to be called 'data'. The script does not attempt to
// handle differences in data dirs, but emits a message if their modification
// times differ.
//
// In order to understand that the same track has different names (and emit a
// rename command instead of remove+copy), the tracks need to begin with either
// a double digit and a dot ("01.") or, if there are less than ten tracks
// possibly a single digit and a dot ("1.").
//
// If individual track names on slave and master differ in such a way that
// sorting the names places the tracks in different order, things can get messy!

var fs = require('fs');

// Called for track directories d0 and d1. Emits command by pushing them onto
// script (a string array).
var cmpTitle = function(d0, d1, script) {
    var files0 = fs.readdirSync(d0).sort();
    var files1 = fs.readdirSync(d1).sort();
    var i = 0;
    var f1, f2, s0, s1;
    while (true) {
        f0 = files0[i];
        f1 = files1[i];
        if (!f0 && !f1) { break; }
        else if (!f0) { script.push("rm -r '"+d1+"/"+f1+"'"); }
        else if (!f1) { script.push("cp -r '"+d0+"/"+f0+"' '"+d1+"'"); }
        else if (sametrack(f0, f1)) {
            s0 = fs.lstatSync(d0+"/"+f0);
            s1 = fs.lstatSync(d1+"/"+f1);

            if (!s0.isFile()) { throw "Not a file: "+d0+"/"+f0; }
            if (!s1.isFile()) { throw "Not a file: "+d1+"/"+f1; }

            if (s0.size !== s1.size) {
                if (s0.mtime < s1.mtime) { throw "Inconsistent modification: "+d1+"/"+f1; }
                script.push("cp '"+d0+"/"+f0+"' '"+d1+"/"+f1+"'");
            }
            if (f0 != f1) {
                if (s0.mtime < s1.mtime) { throw "Inconsistent modification: "+d1+"/"+f1; }
                script.push("mv '"+d1+"/"+f1+"' '"+d1+"/"+f0+"'");
            }
        } else if (f0 == f1 && f0 == "data") {
            s0 = fs.lstatSync(d0+"/"+f0);
            s1 = fs.lstatSync(d1+"/"+f1);

            if (s0.mtime > s1.mtime) { script.push("echo 'Data modification needs manual fix:' '"+d0+"/"+f0+"'"); }
        } else {
            console.log("sametrack: "+sametrack(f0, f1));
            throw "Unusual case: "+d0+"/"+f0+", "+d1+"/"+f1;
        }
        i += 1;
    }
};

// Checks if the track names begin with the same number (denoting track number)
var sametrack = function(f0, f1) {
    if (!f0 || !f1) { return false; }
    n0 = f0.match(/[0-9][0-9]?\./);
    n1 = f1.match(/[0-9][0-9]?\./);
    return n0 && n1 && n0[0] == n1[0];
};

// General directory traversal handler. Takes d0 (master dir), d1 (slave dir),
// script (string array that accumulates commands) and callist (the functions to
// call for each depth in directory nesting).
var cmpDir = function(d0, d1, script, callist) {
    var files0 = fs.readdirSync(d0).sort();
    var files1 = fs.readdirSync(d1).sort();
    var i = 0, j = 0;
    while (true) {
        f0 = files0[i];
        f1 = files1[j];
        if (!f0 && !f1) { break; }
        else if (!f0) { script.push("rm -r '"+d1+"/"+f1+"'"); j += 1; }
        else if (!f1) { script.push("cp -r '"+d0+"/"+f0+"' '"+d1+"'"); i += 1; }
        else if (f0 == f1) {
            callist[0](d0+"/"+f0, d1+"/"+f1, script, callist.slice(1));
            i += 1;
            j += 1;
        } else {
            s0 = fs.lstatSync(d0+"/"+f0);
            s1 = fs.lstatSync(d1+"/"+f1);

            if (!s0.isDirectory()) { throw "Not a directory: "+d0+"/"+f0; }
            if (!s1.isDirectory()) { throw "Not a directory: "+d1+"/"+f1; }
            
            if (f0 > f1) { script.push("rm -r '"+d1+"/"+f1+"'"); j += 1; }
            else         { script.push("cp -r '"+d0+"/"+f0+"' '"+d1+"'"); i += 1; }
        }
    }
};

var script = [], i;
cmpDir(process.argv[2], process.argv[3], script, [cmpDir, cmpTitle]);
for (i = 0; i < script.length; i += 1) {
    console.log(script[i]);
}
