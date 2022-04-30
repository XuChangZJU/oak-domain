"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OakUserUnpermittedException = exports.OakInputIllegalException = exports.OakRowInconsistencyException = exports.OakUserException = exports.OakException = void 0;
class OakException extends Error {
}
exports.OakException = OakException;
class OakUserException extends OakException {
}
exports.OakUserException = OakUserException;
;
// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
class OakRowInconsistencyException extends OakUserException {
    data;
    constructor(data, message) {
        super(message);
        this.data = data;
    }
    getData() {
        return this.data;
    }
}
exports.OakRowInconsistencyException = OakRowInconsistencyException;
;
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
class OakInputIllegalException extends Error {
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
exports.OakInputIllegalException = OakInputIllegalException;
;
/**
 * 用户权限不够时抛的异常
 */
class OakUserUnpermittedException extends Error {
}
exports.OakUserUnpermittedException = OakUserUnpermittedException;
;
