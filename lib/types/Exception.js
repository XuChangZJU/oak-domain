"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeException = exports.OakDeadlock = exports.OakCongruentRowExists = exports.OakRowLockedException = exports.OakUnloggedInException = exports.OakUserUnpermittedException = exports.OakInputIllegalException = exports.OakRowInconsistencyException = exports.OakUserException = exports.OakExternalException = exports.OakRowUnexistedException = exports.OakOperExistedException = exports.OakImportDataParseException = exports.OakDataException = exports.OakException = void 0;
var tslib_1 = require("tslib");
var OakException = /** @class */ (function (_super) {
    tslib_1.__extends(OakException, _super);
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
var OakDataException = /** @class */ (function (_super) {
    tslib_1.__extends(OakDataException, _super);
    function OakDataException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakDataException;
}(OakException));
exports.OakDataException = OakDataException;
var OakImportDataParseException = /** @class */ (function (_super) {
    tslib_1.__extends(OakImportDataParseException, _super);
    // message必传，描述具体错误的数据内容
    function OakImportDataParseException(message, line, header) {
        var _this = _super.call(this, message) || this;
        _this.line = line;
        _this.header = header;
        return _this;
    }
    return OakImportDataParseException;
}(OakException));
exports.OakImportDataParseException = OakImportDataParseException;
var OakOperExistedException = /** @class */ (function (_super) {
    tslib_1.__extends(OakOperExistedException, _super);
    function OakOperExistedException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakOperExistedException;
}(OakDataException));
exports.OakOperExistedException = OakOperExistedException;
var OakRowUnexistedException = /** @class */ (function (_super) {
    tslib_1.__extends(OakRowUnexistedException, _super);
    // 指定主键查询时却发现行不存在，一般发生在缓存中
    function OakRowUnexistedException(rows) {
        var _this = _super.call(this, "\u67E5\u8BE2".concat(rows.map(function (ele) { return ele.entity; }).join(','), "\u5BF9\u8C61\u65F6\u53D1\u73B0\u4E86\u7A7A\u6307\u9488\uFF0C\u8BF7\u68C0\u67E5\u6570\u636E\u4E00\u81F4\u6027")) || this;
        _this.rows = rows;
        return _this;
    }
    OakRowUnexistedException.prototype.toString = function () {
        return JSON.stringify({ rows: this.rows });
    };
    OakRowUnexistedException.prototype.getRows = function () {
        return this.rows;
    };
    return OakRowUnexistedException;
}(OakDataException));
exports.OakRowUnexistedException = OakRowUnexistedException;
var OakExternalException = /** @class */ (function (_super) {
    tslib_1.__extends(OakExternalException, _super);
    function OakExternalException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakExternalException;
}(Error));
exports.OakExternalException = OakExternalException;
var OakUserException = /** @class */ (function (_super) {
    tslib_1.__extends(OakUserException, _super);
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
    tslib_1.__extends(OakRowInconsistencyException, _super);
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
    tslib_1.__extends(OakInputIllegalException, _super);
    function OakInputIllegalException(entity, attributes, message) {
        var _this = _super.call(this, message) || this;
        _this.entity = entity;
        _this.attributes = attributes;
        return _this;
    }
    OakInputIllegalException.prototype.getEntity = function () {
        return this.entity;
    };
    OakInputIllegalException.prototype.getAttributes = function () {
        return this.attributes;
    };
    OakInputIllegalException.prototype.addAttributesPrefix = function (prefix) {
        this.attributes = this.attributes.map(function (ele) { return "".concat(prefix, ".").concat(ele); });
    };
    OakInputIllegalException.prototype.toString = function () {
        return JSON.stringify({
            entity: this.entity,
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
    tslib_1.__extends(OakUserUnpermittedException, _super);
    function OakUserUnpermittedException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return OakUserUnpermittedException;
}(OakUserException));
exports.OakUserUnpermittedException = OakUserUnpermittedException;
;
/**
 * 用户未登录抛的异常
 */
var OakUnloggedInException = /** @class */ (function (_super) {
    tslib_1.__extends(OakUnloggedInException, _super);
    function OakUnloggedInException(message) {
        return _super.call(this, message || '您尚未登录') || this;
    }
    return OakUnloggedInException;
}(OakUserException));
exports.OakUnloggedInException = OakUnloggedInException;
;
/**
 * 用户未登录抛的异常
 */
var OakRowLockedException = /** @class */ (function (_super) {
    tslib_1.__extends(OakRowLockedException, _super);
    function OakRowLockedException(message) {
        return _super.call(this, message || '该行数据正在被更新中，请稍后再试') || this;
    }
    return OakRowLockedException;
}(OakUserException));
exports.OakRowLockedException = OakRowLockedException;
;
/**
 * 要插入行时，发现已经有相同的行数据
 */
var OakCongruentRowExists = /** @class */ (function (_super) {
    tslib_1.__extends(OakCongruentRowExists, _super);
    function OakCongruentRowExists(entity, data, message) {
        var _this = _super.call(this, message) || this;
        _this.data = data;
        _this.entity = entity;
        return _this;
    }
    OakCongruentRowExists.prototype.getData = function () {
        return this.data;
    };
    OakCongruentRowExists.prototype.getEntity = function () {
        return this.entity;
    };
    OakCongruentRowExists.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            data: this.data,
            entity: this.entity,
        });
    };
    return OakCongruentRowExists;
}(OakUserException));
exports.OakCongruentRowExists = OakCongruentRowExists;
var OakDeadlock = /** @class */ (function (_super) {
    tslib_1.__extends(OakDeadlock, _super);
    function OakDeadlock(message) {
        return _super.call(this, message || '发现死锁') || this;
    }
    return OakDeadlock;
}(OakUserException));
exports.OakDeadlock = OakDeadlock;
;
function makeException(data) {
    var name = data.name;
    switch (name) {
        case 'OakException': {
            return new OakException(data.message);
        }
        case 'OakUserException': {
            return new OakUserException(data.message);
        }
        case 'OakExternalException': {
            return new OakExternalException(data.message);
        }
        case 'OakRowInconsistencyException': {
            return new OakRowInconsistencyException(data.data, data.message);
        }
        case 'OakInputIllegalException': {
            return new OakInputIllegalException(data.entity, data.attributes, data.message);
        }
        case 'OakUserUnpermittedException': {
            return new OakUserUnpermittedException(data.message);
        }
        case 'OakUnloggedInException': {
            return new OakUnloggedInException(data.message);
        }
        case 'OakCongruentRowExists': {
            return new OakCongruentRowExists(data.entity, data.data, data.message);
        }
        case 'OakRowLockedException': {
            return new OakRowLockedException(data.message);
        }
        case 'OakRowUnexistedException': {
            return new OakRowUnexistedException(data.rows);
        }
        case 'OakDeadlock': {
            return new OakDeadlock(data.message);
        }
        case 'OakImportDataParseException': {
            return new OakImportDataParseException(data.message, data.line, data.header);
        }
        default:
            return;
    }
}
exports.makeException = makeException;
