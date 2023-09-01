"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formUuid = exports.generateNewId = exports.setGenerateIdOption = exports.produceIds = exports.generateNewIdAsync = exports.expandUuidTo36Bytes = exports.shrinkUuidTo32Bytes = exports.sequentialUuid = void 0;
var tslib_1 = require("tslib");
var uuid_1 = require("uuid");
var random_1 = require("./random/random");
var _nodeId;
var _clockseq;
// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;
// 根据uuid v1改的，产生按时间顺序uuid的函数（更优于底层数据库的插入行为）
// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).slice(1));
}
function unsafeStringify(arr, offset) {
    if (offset === void 0) { offset = 0; }
    // Note: Be careful editing this code!  It's been tuned for performance
    // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
    return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
// See https://github.com/uuidjs/uuid for API details
function sequentialUuid(_a) {
    var random = _a.random;
    var i = 0;
    var b = new Array(16);
    var node = _nodeId;
    var clockseq = _clockseq;
    // node and clockseq need to be initialized to random values if they're not
    // specified.  We do this lazily to minimize issues related to insufficient
    // system entropy.  See #189
    if (node == null || clockseq == null) {
        var seedBytes = random;
        if (node == null) {
            // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
            node = _nodeId = [
                seedBytes[0] | 0x01,
                seedBytes[1],
                seedBytes[2],
                seedBytes[3],
                seedBytes[4],
                seedBytes[5],
            ];
        }
        if (clockseq == null) {
            // Per 4.2.2, randomize (14 bit) clockseq
            clockseq = _clockseq = ((seedBytes[6] << 8) | seedBytes[7]) & 0x3fff;
        }
    }
    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = Date.now();
    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = _lastNSecs + 1;
    // Time since last uuid creation (in msecs)
    var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000;
    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0) {
        clockseq = (clockseq + 1) & 0x3fff;
    }
    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs)) {
        nsecs = 0;
    }
    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
    }
    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;
    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;
    // `time_high_and_version`
    var tmh = ((msecs / 0x100000000) * 10000) & 0xfffffff;
    b[i++] = ((tmh >>> 24) & 0xf) | 0x10; // include version
    b[i++] = (tmh >>> 16) & 0xff;
    // `time_mid`
    b[i++] = (tmh >>> 8) & 0xff;
    b[i++] = tmh & 0xff;
    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = (tl >>> 24) & 0xff;
    b[i++] = (tl >>> 16) & 0xff;
    b[i++] = (tl >>> 8) & 0xff;
    b[i++] = tl & 0xff;
    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = (clockseq >>> 8) | 0x80;
    // `clock_seq_low`
    b[i++] = clockseq & 0xff;
    // `node`
    for (var n = 0; n < 6; ++n) {
        b[i + n] = node[n];
    }
    return unsafeStringify(b);
}
exports.sequentialUuid = sequentialUuid;
function shrinkUuidTo32Bytes(uuid) {
    return uuid.replace(/\-/g, '');
}
exports.shrinkUuidTo32Bytes = shrinkUuidTo32Bytes;
function expandUuidTo36Bytes(uuidShrinked) {
    return "".concat(uuidShrinked.slice(0, 8), "-").concat(uuidShrinked.slice(8, 12), "-").concat(uuidShrinked.slice(12, 16), "-").concat(uuidShrinked.slice(16, 20), "-").concat(uuidShrinked.slice(20));
}
exports.expandUuidTo36Bytes = expandUuidTo36Bytes;
// 直接生成uuid的接口，为了适配各种环境，写成异步
function generateNewIdAsync(option) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var option2, _a, _b;
        var _c, _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    option2 = option || ID_OPTION;
                    if (!((option2 === null || option2 === void 0 ? void 0 : option2.shuffle) || process.env.NODE_ENV === 'development')) return [3 /*break*/, 2];
                    _a = uuid_1.v4;
                    _c = {};
                    return [4 /*yield*/, (0, random_1.getRandomValues)(16)];
                case 1: return [2 /*return*/, _a.apply(void 0, [(_c.random = _e.sent(), _c)])];
                case 2:
                    _b = sequentialUuid;
                    _d = {};
                    return [4 /*yield*/, (0, random_1.getRandomValues)(16)];
                case 3: return [2 /*return*/, _b.apply(void 0, [(_d.random = _e.sent(), _d)])];
            }
        });
    });
}
exports.generateNewIdAsync = generateNewIdAsync;
// 实现同步的id缓存接口，以便于前台使用
var ID_BUFFER = [];
var ID_OPTION = {};
function produceIds() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var iter, _a, _b;
        return tslib_1.__generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    iter = 0;
                    _c.label = 1;
                case 1:
                    if (!(iter < 1024)) return [3 /*break*/, 4];
                    _b = (_a = ID_BUFFER).push;
                    return [4 /*yield*/, generateNewIdAsync()];
                case 2:
                    _b.apply(_a, [_c.sent()]);
                    _c.label = 3;
                case 3:
                    iter++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.produceIds = produceIds;
produceIds();
function setGenerateIdOption(option) {
    ID_OPTION = option;
    ID_BUFFER.splice(0, ID_BUFFER.length);
    return produceIds();
}
exports.setGenerateIdOption = setGenerateIdOption;
function generateNewId() {
    if (ID_BUFFER.length > 0) {
        var id = ID_BUFFER.pop();
        if (ID_BUFFER.length < 128) {
            produceIds();
        }
        return id;
    }
    else {
        // 如果没来的及填满缓冲池，这里用一个简单的算法产生同步id（在小程序环境下跑出来过）
        var random = new Uint8Array(16);
        var iter = 0;
        do {
            random[iter] = Math.ceil(Math.random() * 1000) % 128;
        } while (++iter < 16);
        if ((ID_OPTION === null || ID_OPTION === void 0 ? void 0 : ID_OPTION.shuffle) || process.env.NODE_ENV === 'development') {
            return (0, uuid_1.v4)({ random: random });
        }
        return sequentialUuid({ random: random });
    }
}
exports.generateNewId = generateNewId;
function stringToArrayBuffer(str) {
    var bytes = new Array();
    var len, c;
    len = str.length;
    for (var i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if (c >= 0x010000 && c <= 0x10FFFF) {
            bytes.push(((c >> 18) & 0x07) | 0xF0);
            bytes.push(((c >> 12) & 0x3F) | 0x80);
            bytes.push(((c >> 6) & 0x3F) | 0x80);
            bytes.push((c & 0x3F) | 0x80);
        }
        else if (c >= 0x000800 && c <= 0x00FFFF) {
            bytes.push(((c >> 12) & 0x0F) | 0xE0);
            bytes.push(((c >> 6) & 0x3F) | 0x80);
            bytes.push((c & 0x3F) | 0x80);
        }
        else if (c >= 0x000080 && c <= 0x0007FF) {
            bytes.push(((c >> 6) & 0x1F) | 0xC0);
            bytes.push((c & 0x3F) | 0x80);
        }
        else {
            bytes.push(c & 0xFF);
        }
    }
    var array = new Int8Array(bytes.length);
    for (var i = 0; i <= bytes.length; i++) {
        array[i] = bytes[i];
    }
    return array;
}
/**
 * 在一些特殊场景下根据数据生成指定的uuid，长度不能超过36byte
 * @param: input: 输入的数据数组，应保证唯一性
 */
function formUuid() {
    var input = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        input[_i] = arguments[_i];
    }
    var uuid = input.join('-');
    if (uuid.length <= 36) {
        return uuid;
    }
    var buffer = stringToArrayBuffer(uuid);
    var b = new Array(16);
    var i = 0;
    do {
        b[i++] = 0;
    } while (i < 16);
    i = 0;
    while (i < buffer.length) {
        b[i % 16] += buffer[i];
        i++;
    }
    i = 0;
    do {
        b[i] = b[i] % 256;
        i++;
    } while (i < 16);
    return unsafeStringify(b);
}
exports.formUuid = formUuid;
