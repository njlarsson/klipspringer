fs = require('fs')

var decoder = function() {
    var off = 0;
    var secs, usec, type, code, valu;

    return {
        input: function(b) {
            if (off == 0) { secs = usec = type = code = value = 0; }
            if (off < 4)       { secs = secs | b << (off   )*8; }
            else if (off < 8)  { usec = usec | b << (off- 4)*8; }
            else if (off < 10) { type = type | b << (off- 8)*8; }
            else if (off < 12) { code = code | b << (off-10)*8; }
            else               { valu = valu | b << (off-12)*8; }
            if (++off == 16) {
                console.log('time='+secs+':'+usec+', type='+type+', code='+code+', value='+valu);
                off = 0;
            }
        }
    };
};

var dec = decoder();
var kb = fs.createReadStream('/dev/input/event1');
var i;

kb.on('data', function(buf) {
    for (i = 0; i < buf.length; i += 1) {
        dec.input(buf.readUInt8(i));
    }
});
