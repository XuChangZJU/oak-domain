"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomValues = void 0;
var tslib_1 = require("tslib");
var node_crypto_1 = require("node:crypto");
function getRandomValues(length) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        return tslib_1.__generator(this, function (_a) {
            if (length > 65536) {
                throw new Error('Can only request a maximum of 65536 bytes');
            }
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    (0, node_crypto_1.randomBytes)(length, function (err, buf) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(new Uint8Array(buf));
                    });
                })];
        });
    });
}
exports.getRandomValues = getRandomValues;
