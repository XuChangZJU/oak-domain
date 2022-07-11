"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeException = exports.OakCongruentRowExists = exports.OakUserUnpermittedException = exports.OakInputIllegalException = exports.OakRowInconsistencyException = exports.OakUserException = exports.OakExternalException = exports.OakException = void 0;
class OakException extends Error {
    toString() {
        return JSON.stringify({
            name: this.name,
            message: this.message,
        });
    }
}
exports.OakException = OakException;
class OakExternalException extends Error {
}
exports.OakExternalException = OakExternalException;
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
    toString() {
        return JSON.stringify({
            name: this.name,
            message: this.message,
            data: this.data,
        });
    }
}
exports.OakRowInconsistencyException = OakRowInconsistencyException;
;
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
class OakInputIllegalException extends OakUserException {
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
    toString() {
        return JSON.stringify({
            name: this.name,
            message: this.message,
            attributes: this.attributes,
        });
    }
}
exports.OakInputIllegalException = OakInputIllegalException;
;
/**
 * 用户权限不够时抛的异常
 */
class OakUserUnpermittedException extends OakUserException {
}
exports.OakUserUnpermittedException = OakUserUnpermittedException;
;
/**
 * 要插入行时，发现已经有相同的行数据
 */
class OakCongruentRowExists extends OakUserException {
    data;
    constructor(data, message) {
        super(message);
        this.data = data;
    }
    getData() {
        return this.data;
    }
    toString() {
        return JSON.stringify({
            name: this.name,
            message: this.message,
            data: this.data,
        });
    }
}
exports.OakCongruentRowExists = OakCongruentRowExists;
function makeException(data) {
    const { name } = data;
    switch (name) {
        case OakException.name: {
            return new OakException(data.message);
        }
        case OakUserException.name: {
            return new OakUserException(data.message);
        }
        case OakExternalException.name: {
            return new OakExternalException(data.message);
        }
        case OakRowInconsistencyException.name: {
            return new OakRowInconsistencyException(data.data, data.message);
        }
        case OakInputIllegalException.name: {
            return new OakInputIllegalException(data.attributes, data.message);
        }
        case OakUserUnpermittedException.name: {
            return new OakUserUnpermittedException(data.message);
        }
        case OakCongruentRowExists.name: {
            return new OakCongruentRowExists(data.data, data.message);
        }
        default:
            return;
    }
}
exports.makeException = makeException;
