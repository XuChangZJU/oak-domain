"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandUuidTo36Bytes = exports.shrinkUuidTo32Bytes = void 0;
function shrinkUuidTo32Bytes(uuid) {
    return uuid.replaceAll('-', '');
}
exports.shrinkUuidTo32Bytes = shrinkUuidTo32Bytes;
function expandUuidTo36Bytes(uuidShrinked) {
    return `${uuidShrinked.slice(0, 8)}-${uuidShrinked.slice(8, 12)}-${uuidShrinked.slice(12, 16)}-${uuidShrinked.slice(16, 20)}-${uuidShrinked.slice(20)}`;
}
exports.expandUuidTo36Bytes = expandUuidTo36Bytes;
