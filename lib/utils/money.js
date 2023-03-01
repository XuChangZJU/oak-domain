"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentToString = exports.StringToCent = exports.ToYuan = exports.ToCent = void 0;
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
