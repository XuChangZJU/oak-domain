"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeException = exports.OakCongruentRowExists = exports.OakUserUnpermittedException = exports.OakInputIllegalException = exports.OakRowInconsistencyException = exports.OakUserException = exports.OakExternalException = exports.OakException = void 0;
var OakException = /** @class */ (function (_super) {
    __extends(OakException, _super);
    function OakException(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        _this.name = _newTarget.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(_this, _newTarget);
        }
        if (typeof Object.setPrototypeOf === 'function') {
            Object.setPrototypeOf(_this, _newTarget.prototype);
        }
        else {
            _this.__proto__ = _newTarget.prototype;
        }
        return _this;
    }
    OakException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
        });
    };
    return OakException;
}(Error));
exports.OakException = OakException;
var OakExternalException = /** @class */ (function (_super) {
    __extends(OakExternalException, _super);
    function OakExternalException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakExternalException;
}(Error));
exports.OakExternalException = OakExternalException;
var OakUserException = /** @class */ (function (_super) {
    __extends(OakUserException, _super);
    function OakUserException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakUserException;
}(OakException));
exports.OakUserException = OakUserException;
;
// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
var OakRowInconsistencyException = /** @class */ (function (_super) {
    __extends(OakRowInconsistencyException, _super);
    function OakRowInconsistencyException(data, message) {
        var _this = _super.call(this, message) || this;
        _this.data = data;
        return _this;
    }
    OakRowInconsistencyException.prototype.getData = function () {
        return this.data;
    };
    OakRowInconsistencyException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            data: this.data,
        });
    };
    return OakRowInconsistencyException;
}(OakUserException));
exports.OakRowInconsistencyException = OakRowInconsistencyException;
;
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
var OakInputIllegalException = /** @class */ (function (_super) {
    __extends(OakInputIllegalException, _super);
    function OakInputIllegalException(attributes, message) {
        var _this = _super.call(this, message) || this;
        _this.attributes = attributes;
        return _this;
    }
    OakInputIllegalException.prototype.getAttributes = function () {
        return this.attributes;
    };
    OakInputIllegalException.prototype.addAttributesPrefix = function (prefix) {
        this.attributes = this.attributes.map(function (ele) { return "".concat(prefix, ".").concat(ele); });
    };
    OakInputIllegalException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            attributes: this.attributes,
        });
    };
    return OakInputIllegalException;
}(OakUserException));
exports.OakInputIllegalException = OakInputIllegalException;
;
/**
 * 用户权限不够时抛的异常
 */
var OakUserUnpermittedException = /** @class */ (function (_super) {
    __extends(OakUserUnpermittedException, _super);
    function OakUserUnpermittedException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakUserUnpermittedException;
}(OakUserException));
exports.OakUserUnpermittedException = OakUserUnpermittedException;
;
/**
 * 要插入行时，发现已经有相同的行数据
 */
var OakCongruentRowExists = /** @class */ (function (_super) {
    __extends(OakCongruentRowExists, _super);
    function OakCongruentRowExists(data, message) {
        var _this = _super.call(this, message) || this;
        _this.data = data;
        return _this;
    }
    OakCongruentRowExists.prototype.getData = function () {
        return this.data;
    };
    OakCongruentRowExists.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            data: this.data,
        });
    };
    return OakCongruentRowExists;
}(OakUserException));
exports.OakCongruentRowExists = OakCongruentRowExists;
function makeException(data) {
    var name = data.name;
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
