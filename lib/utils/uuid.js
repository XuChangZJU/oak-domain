"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandUuidTo36Bytes = exports.shrinkUuidTo32Bytes = void 0;
function shrinkUuidTo32Bytes(uuid) {
    return uuid.replaceAll('-', '');
}
exports.shrinkUuidTo32Bytes = shrinkUuidTo32Bytes;
function expandUuidTo36Bytes(uuidShrinked) {
    return "".concat(uuidShrinked.slice(0, 8), "-").concat(uuidShrinked.slice(8, 12), "-").concat(uuidShrinked.slice(12, 16), "-").concat(uuidShrinked.slice(16, 20), "-").concat(uuidShrinked.slice(20));
}
exports.expandUuidTo36Bytes = expandUuidTo36Bytes;
