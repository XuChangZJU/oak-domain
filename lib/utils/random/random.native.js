"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomValues = void 0;
const tslib_1 = require("tslib");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
async function getRandomValues(length) {
    if (length > 65536) {
        throw new Error('Can only request a maximum of 65536 bytes');
    }
    const randomValues = crypto_1.default.randomBytes(length);
    return new Uint8Array(randomValues);
    ;
}
exports.getRandomValues = getRandomValues;
