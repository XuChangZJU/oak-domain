"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomValues = void 0;
const node_crypto_1 = require("node:crypto");
async function getRandomValues(length) {
    if (length > 65536) {
        throw new Error('Can only request a maximum of 65536 bytes');
    }
    return new Promise((resolve, reject) => {
        (0, node_crypto_1.randomBytes)(length, (err, buf) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(new Uint8Array(buf));
        });
    });
}
exports.getRandomValues = getRandomValues;
