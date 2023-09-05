"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formUuid = exports.generateNewId = exports.setGenerateIdOption = exports.produceIds = exports.generateNewIdAsync = exports.expandUuidTo36Bytes = exports.shrinkUuidTo32Bytes = exports.sequentialUuid = void 0;
const uuid_1 = require("uuid");
const random_1 = require("./random/random");
let _nodeId;
let _clockseq;
// Previous uuid creation time
let _lastMSecs = 0;
let _lastNSecs = 0;
// 根据uuid v1改的，产生按时间顺序uuid的函数（更优于底层数据库的插入行为）
// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
    // Note: Be careful editing this code!  It's been tuned for performance
    // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
    return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
// See https://github.com/uuidjs/uuid for API details
function sequentialUuid({ random }) {
    let i = 0;
    const b = new Array(16);
    let node = _nodeId;
    let clockseq = _clockseq;
    // node and clockseq need to be initialized to random values if they're not
    // specified.  We do this lazily to minimize issues related to insufficient
    // system entropy.  See #189
    if (node == null || clockseq == null) {
        const seedBytes = random;
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
    let msecs = Date.now();
    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    let nsecs = _lastNSecs + 1;
    // Time since last uuid creation (in msecs)
    const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000;
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
    const tmh = ((msecs / 0x100000000) * 10000) & 0xfffffff;
    b[i++] = ((tmh >>> 24) & 0xf) | 0x10; // include version
    b[i++] = (tmh >>> 16) & 0xff;
    // `time_mid`
    b[i++] = (tmh >>> 8) & 0xff;
    b[i++] = tmh & 0xff;
    // `time_low`
    const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = (tl >>> 24) & 0xff;
    b[i++] = (tl >>> 16) & 0xff;
    b[i++] = (tl >>> 8) & 0xff;
    b[i++] = tl & 0xff;
    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = (clockseq >>> 8) | 0x80;
    // `clock_seq_low`
    b[i++] = clockseq & 0xff;
    // `node`
    for (let n = 0; n < 6; ++n) {
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
    return `${uuidShrinked.slice(0, 8)}-${uuidShrinked.slice(8, 12)}-${uuidShrinked.slice(12, 16)}-${uuidShrinked.slice(16, 20)}-${uuidShrinked.slice(20)}`;
}
exports.expandUuidTo36Bytes = expandUuidTo36Bytes;
// 直接生成uuid的接口，为了适配各种环境，写成异步
async function generateNewIdAsync(option) {
    const option2 = option || ID_OPTION;
    if (option2?.shuffle || process.env.NODE_ENV === 'development') {
        return (0, uuid_1.v4)({ random: await (0, random_1.getRandomValues)(16) });
    }
    return sequentialUuid({ random: await (0, random_1.getRandomValues)(16) });
}
exports.generateNewIdAsync = generateNewIdAsync;
// 实现同步的id缓存接口，以便于前台使用
const ID_BUFFER = [];
let ID_OPTION = {};
async function produceIds() {
    let iter = 0;
    for (; iter < 1024; iter++) {
        ID_BUFFER.push(await generateNewIdAsync());
    }
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
        const id = ID_BUFFER.pop();
        if (ID_BUFFER.length < 128) {
            produceIds();
        }
        return id;
    }
    else {
        // 如果没来的及填满缓冲池，这里用一个简单的算法产生同步id（在小程序环境下跑出来过）
        const random = new Uint8Array(16);
        let iter = 0;
        do {
            random[iter] = Math.ceil(Math.random() * 1000) % 128;
        } while (++iter < 16);
        if (ID_OPTION?.shuffle || process.env.NODE_ENV === 'development') {
            return (0, uuid_1.v4)({ random });
        }
        return sequentialUuid({ random });
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
function formUuid(...input) {
    let uuid = input.join('-');
    if (uuid.length <= 36) {
        return uuid;
    }
    const buffer = stringToArrayBuffer(uuid);
    const b = new Array(16);
    let i = 0;
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
