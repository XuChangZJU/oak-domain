"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskStar = exports.maskName = exports.maskMobile = exports.maskIdCard = void 0;
const maskIdCard = (idCardNumber) => {
    if (!idCardNumber instanceof String) {
        throw new Error("身份证号码必须是String类型");
    }
    let begin = idCardNumber.slice(0, 4);
    let end = idCardNumber.slice(idCardNumber.length - 4, 4);
    for (let i = 0; i < idCardNumber.length - 8; i++) {
        begin = begin.concat("*");
    }
    return begin.concat(end);
};
exports.maskIdCard = maskIdCard;
const maskMobile = (mobile) => {
    let begin = mobile.slice(0, 3);
    let end = mobile.slice(7, 11);
    return begin.concat("****").concat(end);
};
exports.maskMobile = maskMobile;
const maskName = (name) => {
    return name.slice(0, name.length - 1).concat("*");
};
exports.maskName = maskName;
const maskStar = (str, frontLen, endLen, star = '*') => {
    const len = str.length - frontLen - endLen;
    let xing = '';
    for (let i = 0; i < len; i++) {
        xing += star;
    }
    return str.substring(0, frontLen) + xing + str.substring(str.length - endLen);
};
exports.maskStar = maskStar;
