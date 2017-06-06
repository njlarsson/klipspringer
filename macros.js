var fs = require('fs');

exports.expand = function(input, values, callback) {
    var output = "";
    var r = /\$([A-Z]+)\((.*)\)\$/g;

    // Recursive function: appends one expansion, finds next macro.
    var appendAndMatch = function(expansion) {
        output += expansion;
        var p = r.lastIndex;
        var m = r.exec(input);
        if (!m) {
            // No more match, done.
            output += input.substring(p);
            callback(output);
        } else {
            output += input.substring(p, m.index);
            if (m[1] == 'VALUE') {
                // Get expansion from values object.
                appendAndMatch(values[m[2]]);
            } else if (m[1] == 'FILE') {
                // Get expansion from file.
                fs.readFile(m[2], { encoding: 'utf8' }, function(err, data) {
                    appendAndMatch(data);
                });
            } else {
                // Copy verbatim
                appendAndMatch(m[0]);
            }
        }
    };
    appendAndMatch("");
};                            
