"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotEnoughMoneyException = exports.UnloggedInException = exports.UserException = exports.UserUnpermittedException = exports.InputIllegalException = exports.DataInconsistencyException = void 0;
// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
class DataInconsistencyException extends Error {
    data;
    constructor(data, message) {
        super(message);
        this.data = data;
    }
    getData() {
        return this.data;
    }
}
exports.DataInconsistencyException = DataInconsistencyException;
;
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
class InputIllegalException extends Error {
    attributes;
    constructor(attributes, message) {
        super(message);
        this.attributes = attributes;
    }
    getAttributes() {
        return this.attributes;
    }
    addAttributesPrefix(prefix) {
        this.attributes = this.attributes.map(ele => `${prefix}.${ele}`);
    }
}
exports.InputIllegalException = InputIllegalException;
;
/**
 * 用户权限不够时抛的异常
 */
class UserUnpermittedException extends Error {
}
exports.UserUnpermittedException = UserUnpermittedException;
;
// 以下是应用公共的异常定义
class UserException extends Error {
}
exports.UserException = UserException;
;
class UnloggedInException extends UserException {
    constructor(message) {
        super(message || '您尚未登录');
    }
}
exports.UnloggedInException = UnloggedInException;
;
class NotEnoughMoneyException extends UserException {
    constructor(message) {
        super(message || '您的余额不足');
    }
}
exports.NotEnoughMoneyException = NotEnoughMoneyException;
;
