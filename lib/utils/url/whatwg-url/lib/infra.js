"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isASCIIHex = exports.isASCIIAlphanumeric = exports.isASCIIAlpha = exports.isASCIIDigit = void 0;
function isASCIIDigit(c) {
    return c >= 0x30 && c <= 0x39;
}
exports.isASCIIDigit = isASCIIDigit;
function isASCIIAlpha(c) {
    return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A);
}
exports.isASCIIAlpha = isASCIIAlpha;
function isASCIIAlphanumeric(c) {
    return isASCIIAlpha(c) || isASCIIDigit(c);
}
exports.isASCIIAlphanumeric = isASCIIAlphanumeric;
function isASCIIHex(c) {
    return isASCIIDigit(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
}
exports.isASCIIHex = isASCIIHex;
exports.default = {
    isASCIIDigit,
    isASCIIAlpha,
    isASCIIAlphanumeric,
    isASCIIHex
};
