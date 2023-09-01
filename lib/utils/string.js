"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unescapeUnicode = exports.randomName = exports.random = exports.template = exports.firstLetterUpperCase = exports.firstLetterLowerCase = void 0;
function firstLetterLowerCase(s) {
    return s.slice(0, 1).toLowerCase().concat(s.slice(1));
}
exports.firstLetterLowerCase = firstLetterLowerCase;
function firstLetterUpperCase(s) {
    return s.slice(0, 1).toUpperCase().concat(s.slice(1));
}
exports.firstLetterUpperCase = firstLetterUpperCase;
/**
 * 模板字符串 使用 定义const NotFilled = template`${0}未填写`; 调用NotFilled('姓名') 等于姓名未填写
 * @param strings
 * @param keys
 * @returns {function(...[*]): string}
 */
var template = function (strings) {
    var keys = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        keys[_i - 1] = arguments[_i];
    }
    return (function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        var dict = values[values.length - 1] || {};
        var result = [strings[0]];
        keys.forEach(function (key, i) {
            var value = Number.isInteger(key) ? values[key] : dict[key];
            result.push(value, strings[i + 1]);
        });
        return result.join('');
    });
};
exports.template = template;
/**
 * 随机生成字符串
 * @param randomLength
 * @returns
 */
var random = function (randomLength) {
    if (randomLength === void 0) { randomLength = 16; }
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    var DICT = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    var maxPos = DICT.length;
    var pwd = '';
    for (var i = 0; i < randomLength; i++) {
        pwd += DICT.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
};
exports.random = random;
/**
 * 随机生成带前缀的字符串
 * @param prefix 第一个参数为你想生成的固定的文字开头比如: 微信用户xxxxx
 * @param randomLength 第二个为你想生成出固定开头文字外的随机长度
 * @returns
 */
var randomName = function (prefix, randomLength) {
    if (randomLength === void 0) { randomLength = 8; }
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    var DICT = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    var maxPos = DICT.length;
    var name = prefix === undefined ? '' : prefix;
    name += (0, exports.random)(randomLength);
    return name;
};
exports.randomName = randomName;
/**
 * 将字符串中的u16编码转换回汉字
 * @param str
 * @returns
 */
function unescapeUnicode(str) {
    return str.replace(/\\u[\dA-F]{4}/gi, function (match) {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
}
exports.unescapeUnicode = unescapeUnicode;
;
