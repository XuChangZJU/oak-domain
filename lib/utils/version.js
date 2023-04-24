"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareVersion = void 0;
/**
 * 版本比较
 * @param curVersion 当前版本
 * @param reqVersion 比较版本
 * @returns
 */
var compareVersion = function (curVersion, reqVersion) {
    var v1 = curVersion.split('.');
    var v2 = reqVersion.split('.');
    for (var i = 0; i < Math.max(v1.length, v2.length); i++) {
        var num1 = i < v1.length ? parseInt(v1[i], 10) : 0;
        var num2 = i < v2.length ? parseInt(v2[i], 10) : 0;
        if (num1 !== num2)
            return num1 - num2;
    }
    return 0;
};
exports.compareVersion = compareVersion;
