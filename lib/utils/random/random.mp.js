"use strict";
/// <reference types="wechat-miniprogram" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomValues = void 0;
var tslib_1 = require("tslib");
function getRandomValues(length) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var randomValues;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (length > 65536) {
                        throw new Error('Can only request a maximum of 65536 bytes');
                    }
                    return [4 /*yield*/, wx.getRandomValues({
                            length: length,
                        })];
                case 1:
                    randomValues = (_a.sent()).randomValues;
                    return [2 /*return*/, new Uint8Array(randomValues)];
            }
        });
    });
}
exports.getRandomValues = getRandomValues;
