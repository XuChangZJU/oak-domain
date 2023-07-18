"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThousandCont = exports.CentToString = exports.StringToCent = exports.ToYuan = exports.ToCent = void 0;
var ToCent = function (float) {
    return Math.round(float * 100);
};
exports.ToCent = ToCent;
var ToYuan = function (int) {
    return Math.round(int) / 100;
};
exports.ToYuan = ToYuan;
var StringToCent = function (value, allowNegative) {
    var numValue = parseInt(value, 10);
    if (typeof numValue === 'number' && (numValue >= 0 || allowNegative)) {
        return ToCent(numValue);
    }
};
exports.StringToCent = StringToCent;
var CentToString = function (value) {
    if (typeof value === 'number') {
        return "".concat(ToYuan(value));
    }
};
exports.CentToString = CentToString;
var ThousandCont = function (value) {
    var value1 = "".concat(value);
    var numArr = value1.split('.');
    value1 = numArr[0];
    var result = '';
    while (value1.length > 3) {
        result = ',' + value1.slice(-3) + result;
        value1 = value1.slice(0, value1.length - 3);
    }
    if (value1) {
        result = value1 + result;
    }
    result = numArr[1] ? result + '.' + numArr[1] : result;
    return result;
};
exports.ThousandCont = ThousandCont;
