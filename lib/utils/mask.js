"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskStar = exports.maskName = exports.maskMobile = exports.maskIdCard = void 0;
var maskIdCard = function (idCardNumber) {
    if (!idCardNumber instanceof String) {
        throw new Error("身份证号码必须是String类型");
    }
    var begin = idCardNumber.slice(0, 4);
    var end = idCardNumber.slice(idCardNumber.length - 4, 4);
    for (var i = 0; i < idCardNumber.length - 8; i++) {
        begin = begin.concat("*");
    }
    return begin.concat(end);
};
exports.maskIdCard = maskIdCard;
var maskMobile = function (mobile) {
    var begin = mobile.slice(0, 3);
    var end = mobile.slice(7, 11);
    return begin.concat("****").concat(end);
};
exports.maskMobile = maskMobile;
var maskName = function (name) {
    return name.slice(0, name.length - 1).concat("*");
};
exports.maskName = maskName;
var maskStar = function (str, frontLen, endLen, star) {
    if (star === void 0) { star = '*'; }
    var len = str.length - frontLen - endLen;
    var xing = '';
    for (var i = 0; i < len; i++) {
        xing += star;
    }
    return str.substring(0, frontLen) + xing + str.substring(str.length - endLen);
};
exports.maskStar = maskStar;
