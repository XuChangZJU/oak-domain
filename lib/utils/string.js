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
const template = (strings, ...keys) => {
    return (function (...values) {
        const dict = values[values.length - 1] || {};
        const result = [strings[0]];
        keys.forEach((key, i) => {
            const value = Number.isInteger(key) ? values[key] : dict[key];
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
const random = (randomLength = 16) => {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    const DICT = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    const maxPos = DICT.length;
    let pwd = '';
    for (let i = 0; i < randomLength; i++) {
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
const randomName = (prefix, randomLength = 8) => {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    const DICT = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    const maxPos = DICT.length;
    let name = prefix === undefined ? '' : prefix;
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
    return str.replace(/\\u[\dA-F]{4}/gi, (match) => {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
}
exports.unescapeUnicode = unescapeUnicode;
;
