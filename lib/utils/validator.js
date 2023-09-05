/**
 * Created by Xc on 2018/12/23.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAttributesScope = exports.checkAttributesNotNull = exports.isVehicleNumber = exports.isMoney = exports.isNumber = exports.isTel = exports.isPhone = exports.isDigital = exports.isSizedCaptcha = exports.isNickname = exports.isUrl = exports.isSoldierNumber = exports.isBirthNumber = exports.isTwCardNumber = exports.isAmCardNumber = exports.isHkCardNumber = exports.isPassportNumber = exports.isIdCardNumber = exports.isCaptcha = exports.isPassword = exports.isMobile = void 0;
const types_1 = require("../types");
const isMobile = (text) => {
    return ((text) && (typeof text === "string") && ((/^1[3|4|5|6|7|8|9]\d{9}$/.test(text))));
};
exports.isMobile = isMobile;
const isPassword = (text) => {
    return ((text) && (typeof text === "string") && (/^[a-zA-Z0-9!.@]{8,16}$/.test(text)));
};
exports.isPassword = isPassword;
const isCaptcha = (text) => {
    return ((text) && (typeof text === "string") && (/^\d{4}$/.test(text)));
};
exports.isCaptcha = isCaptcha;
const isIdCardNumber = (text) => {
    return ((typeof text === "string") && text.length === 18 && (/^\d{6}(18|19|20)\d{2}(0[1-9]|1[012])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i.test(text)));
};
exports.isIdCardNumber = isIdCardNumber;
const isPassportNumber = (text) => {
    // 护照
    // 规则： 14/15开头 + 7位数字, G + 8位数字, P + 7位数字, S/D + 7或8位数字,等
    // 样本： 141234567, G12345678, P1234567
    return typeof text === 'string' && /^([a-zA-z]|[0-9]){5,17}$/.test(text);
};
exports.isPassportNumber = isPassportNumber;
const isHkCardNumber = (text) => {
    // 港澳居民来往内地通行证
    // 规则： H/M + 10位或6位数字
    // 样本： H1234567890
    return typeof text === 'string' && /^([A-Z]\d{6,10}(\(\w{1}\))?)$/.test(text);
};
exports.isHkCardNumber = isHkCardNumber;
const isAmCardNumber = (text) => {
    return typeof text === 'string' && /^([A-Z]\d{6,10}(\(\w{1}\))?)$/.test(text);
};
exports.isAmCardNumber = isAmCardNumber;
const isTwCardNumber = (text) => {
    // 台湾居民来往大陆通行证
    // 规则： 新版8位或18位数字， 旧版10位数字 + 英文字母
    // 样本： 12345678 或 1234567890B
    return typeof text === 'string' && /^\d{8}|^[a-zA-Z0-9]{10}|^\d{18}$/.test(text);
};
exports.isTwCardNumber = isTwCardNumber;
const isBirthNumber = (text) => {
    return typeof text === 'string' && /^[a-zA-Z0-9]{5,21}$/.test(text);
};
exports.isBirthNumber = isBirthNumber;
const isSoldierNumber = (text) => {
    // 军官证
    // 规则： 军/兵/士/文/职/广/（其他中文） + "字第" + 4到8位字母或数字 + "号"
    // 样本： 军字第2001988号, 士字第P011816X号
    return typeof text === 'string' && /^[\u4E00-\u9FA5](字第)([0-9a-zA-Z]{4,8})(号?)$/.test(text);
};
exports.isSoldierNumber = isSoldierNumber;
const isUrl = (str) => {
    const regex = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
    return typeof str === "string" && regex.test(str);
};
exports.isUrl = isUrl;
const isNickname = (str) => {
    return str && typeof str === "string" && str.trim().length > 0 && str.length < 16;
};
exports.isNickname = isNickname;
const isSizedCaptcha = (text, size) => {
    return typeof text === 'string' && text.length === size && !isNaN(parseInt(text, 10));
};
exports.isSizedCaptcha = isSizedCaptcha;
const isDigital = (digital) => {
    return /^\d{6,12}$/.test(digital);
};
exports.isDigital = isDigital;
const isPhone = (phone) => {
    // return /^((\d{11})|^((\d{7,8})|(\d{4}|\d{3})-(\d{7,8})|(\d{4}|\d{3})-(\d{7,8})-(\d{4}|\d{3}|\d{2}|\d{1})|(\d{7,8})-(\d{4}|\d{3}|\d{2}|\d{1}))$)/.test(phone);
    return /^(\(\d{3,4}\)|\d{3,4}-)?\d{7,8}$/.test(phone);
};
exports.isPhone = isPhone;
const isTel = (text) => {
    // 1、133xxxx4545 2、0571-630xx239 3、400-123-1400
    const reg = /^(((\d{3,4}-)?[0-9]{7,8})|(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}|((400)-(\d{3})-(\d{4})(.)(\d{1,4})|(400)-(\d{3})-(\d{4}$)|(400)(\d{3})(\d{4}$)|(400)-(\d{4})-(\d{3}$)))$/.test(text);
    return reg;
};
exports.isTel = isTel;
const isNumber = (str) => {
    return /^[0-9]*$/.test(str);
};
exports.isNumber = isNumber;
const isMoney = (str, zero) => {
    // 金额，最多可以有两位小数 zero为true包含零
    if (zero) {
        return /(^[1-9]([0-9]+)?(\.[0-9]{1,2})?$)|(^(0){1}$)|(^[0-9]\.[0-9]([0-9])?$)/.test(str);
    }
    return /(^[1-9](\d+)?(\.\d{1,2})?$)|(^\d\.\d{1,2}$)/.test(str);
};
exports.isMoney = isMoney;
const isVehicleNumber = (str) => {
    // const xreg=/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}(([0-9]{5}[DF]$)|([DF][A-HJ-NP-Z0-9][0-9]{4}$))/;
    // const creg=/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]{1}$/;
    const reg = /^(([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](([0-9]{5}[DF])|([DF]([A-HJ-NP-Z0-9])[0-9]{4})))|([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领]))$/;
    return reg.test(str);
};
exports.isVehicleNumber = isVehicleNumber;
function checkAttributesNotNull(entity, data, attributes, allowEmpty) {
    const attrs = attributes.filter((attr) => {
        if (data[attr] === null || data[attr] === '' || data[attr] === undefined) {
            return true;
        }
        if (!allowEmpty && !data.hasOwnProperty(attr)) {
            return true;
        }
    });
    if (attrs.length > 0) {
        throw new types_1.OakAttrNotNullException(entity, attrs, '属性不能为空');
    }
}
exports.checkAttributesNotNull = checkAttributesNotNull;
;
function checkAttributesScope(entity, data, attributes) {
    const attrs = attributes.filter(attr => !data.hasOwnProperty(attr));
    if (attrs.length > 0) {
        throw new types_1.OakInputIllegalException(entity, attrs, '多余的属性');
    }
}
exports.checkAttributesScope = checkAttributesScope;
