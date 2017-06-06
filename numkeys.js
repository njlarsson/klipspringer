var fs = require('fs');
var process = require('process');

var keyTranslation = exports.keyTranslation = {
    '\b': [14, false],
    '\t': [15, false],
    '\n': [28, false],
    '*': [55, false],
    '7': [71, true],
    '8': [72, true],
    '9': [73, true],
    '-': [74, true],
    '4': [75, true],
    '5': [76, true],
    '6': [77, true],
    '+': [78, false],
    '1': [79, true],
    '2': [80, true],
    '3': [81, true],
    '0': [82, true],
    '.': [83, true],
    '/': [98, false]
};

var makeDownActionArray = function(charToFunMap) {
    var a = [];

    for (c in charToFunMap) {
        a[keyTranslation[c][0]] = charToFunMap[c];
    }
    return a;
}

exports.setupKeyActions = function(devHandle, charToFunMap) {
    var downAction = makeDownActionArray(charToFunMap);
    var root = { edge: [] };
    var state = root;
    var mem = 0;
    var down = 0, downSince = 0;
    
    var react = function(code, time) {
        if (state.edge[code]) {
            state = state.edge[code];
        } else if (state.edge[0]) {
            mem = code;
            state = state.edge[0];
        } else {
            debug("Branched out of FSM on "+code);
            state = root;
            mem = 0;
        }
        if (state.action) {
            state.action(time, code, mem);
            state = root;
            mem = 0;
        }
    }
    
    var addSequence = function(seq, action) {
        var i, code, u = root;
        for (i = 0; i < seq.length; i += 1) {
            if (!u.edge[seq[i]]) { u.edge[seq[i]] = { edge: [] } };
            u = u.edge[seq[i]];
        }
        if (u.action) { throw "Conflict in FSM action: "+seq; }
        if (action) { u.action = action; }
    }

    var downNonrep = function(time, lastCode, memCode) {
        down = memCode;
        downSince = time;
        if (downAction[down]) { process.nextTick(downAction[memCode], time, memCode); }
    }

    var upNonrep = function(time, lastCode, memCode) {
        down = 0;
        downSince = 0;
    }

    var downRep = function(time, code) {
        if ((down !== code || time - downSince > 0.2) && downAction[code]) {
            process.nextTick(downAction[code], time, code);
        }
        down = code;
        downSince = time;
    }

    addSequence([69, 0, 69], downNonrep);
    addSequence([0, 69, 69], upNonrep);
    addSequence([15], downRep); // tab, doesn't really repeat, but it's a single code
    addSequence([98], downRep); // /, doesn't really repeat, but it's a single code
    addSequence([55], downRep); // *
    addSequence([14], downRep); // backspace
    addSequence([78], downRep); // +
    addSequence([28], downRep); // enter
    
    var eventDecoder = function() {
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
                    if (type === 1) { react(code, secs + usec/1000000); }
                    off = 0;
                }
            }
        };
    }

    var kb = fs.createReadStream(devHandle);
    var dec = eventDecoder();
    kb.on('data', function(buf) {
        for (i = 0; i < buf.length; i += 1) {
            dec.input(buf.readUInt8(i));
        }
    });
};
