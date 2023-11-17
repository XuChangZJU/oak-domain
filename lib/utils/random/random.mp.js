"use strict";
/// <reference types="wechat-miniprogram" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomValues = void 0;
async function getRandomValues(length) {
    if (length > 65536) {
        throw new Error('Can only request a maximum of 65536 bytes');
    }
    const { randomValues } = await wx.getRandomValues({
        length,
    });
    return new Uint8Array(randomValues);
}
exports.getRandomValues = getRandomValues;
