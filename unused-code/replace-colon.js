var fs = require('fs');

var repl = function(d) {
    var i, f, p;
    var files = fs.readdirSync(d);
    for (i = 0; i < files.length; i += 1) {
        f = files[i];
        fʹ = f.replace(/:/g, ',');
        if (f != fʹ) {
            fs.renameSync(d+'/'+f, d+'/'+fʹ);
            f = fʹ;
        }
        if (fs.lstatSync(d+'/'+f).isDirectory()) { repl(d+'/'+f); }
    }
};

repl(process.argv[2]);
