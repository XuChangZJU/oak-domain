"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeException = exports.OakPreConditionUnsetException = exports.OakDeadlock = exports.OakCongruentRowExists = exports.OakRowLockedException = exports.OakUnloggedInException = exports.OakUserUnpermittedException = exports.OakAttrNotNullException = exports.OakInputIllegalException = exports.OakRowInconsistencyException = exports.OakUserException = exports.OakExternalException = exports.OakRowUnexistedException = exports.OakOperExistedException = exports.OakNoRelationDefException = exports.OakImportDataParseException = exports.OakUniqueViolationException = exports.OakDataException = exports.OakException = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
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
        _this.opRecord = {
            a: 's',
            d: {},
        };
        return _this;
    }
    OakException.prototype.addData = function (entity, rows) {
        var d = this.opRecord.d;
        var addSingleRow = function (rowRoot, row) {
            var id = row.id;
            if (rowRoot[id]) {
                Object.assign(rowRoot[id], row);
            }
            else {
                rowRoot[id] = row;
            }
        };
        if (!d[entity]) {
            d[entity] = {};
        }
        rows.forEach(function (row) { return addSingleRow(d[entity], row); });
    };
    OakException.prototype.setOpRecords = function (opRecord) {
        this.opRecord = opRecord;
    };
    OakException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            opRecord: this.opRecord,
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
var OakUniqueViolationException = /** @class */ (function (_super) {
    tslib_1.__extends(OakUniqueViolationException, _super);
    function OakUniqueViolationException(rows, message) {
        var _this = _super.call(this, message || '您更新的数据违反了唯一性约束') || this;
        _this.rows = rows;
        return _this;
    }
    return OakUniqueViolationException;
}(OakException));
exports.OakUniqueViolationException = OakUniqueViolationException;
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
var OakNoRelationDefException = /** @class */ (function (_super) {
    tslib_1.__extends(OakNoRelationDefException, _super);
    function OakNoRelationDefException(entity, action, msg) {
        var _this = _super.call(this, msg || "\u5BF9\u8C61".concat(entity, "\u7684\u64CD\u4F5C").concat(action, "\u627E\u4E0D\u5230\u6709\u6548\u7684relation\u5B9A\u4E49")) || this;
        _this.entity = entity;
        _this.action = action;
        return _this;
    }
    OakNoRelationDefException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            entity: this.entity,
            action: this.action,
        });
    };
    return OakNoRelationDefException;
}(OakDataException));
exports.OakNoRelationDefException = OakNoRelationDefException;
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
        (0, assert_1.default)(!data, '现在使用addData接口来传数据');
        return _this;
    }
    OakRowInconsistencyException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
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
// 属性为空
var OakAttrNotNullException = /** @class */ (function (_super) {
    tslib_1.__extends(OakAttrNotNullException, _super);
    function OakAttrNotNullException(entity, attributes, message) {
        return _super.call(this, entity, attributes, message || '属性不允许为空') || this;
    }
    return OakAttrNotNullException;
}(OakInputIllegalException));
exports.OakAttrNotNullException = OakAttrNotNullException;
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
var OakPreConditionUnsetException = /** @class */ (function (_super) {
    tslib_1.__extends(OakPreConditionUnsetException, _super);
    function OakPreConditionUnsetException(message, entity, code) {
        var _this = _super.call(this, message || '前置条件不满足') || this;
        _this.entity = entity,
            _this.code = code;
        return _this;
    }
    OakPreConditionUnsetException.prototype.toString = function () {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            code: this.code,
            entity: this.entity,
        });
    };
    return OakPreConditionUnsetException;
}(OakUserException));
exports.OakPreConditionUnsetException = OakPreConditionUnsetException;
function makeException(data) {
    var name = data.name;
    switch (name) {
        case 'OakException': {
            var e = new OakException(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakUserException': {
            var e = new OakUserException(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakRowInconsistencyException': {
            var e = new OakRowInconsistencyException(data.data, data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakInputIllegalException': {
            var e = new OakInputIllegalException(data.entity, data.attributes, data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakUserUnpermittedException': {
            var e = new OakUserUnpermittedException(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakUnloggedInException': {
            var e = new OakUnloggedInException(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakCongruentRowExists': {
            var e = new OakCongruentRowExists(data.entity, data.data, data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakRowLockedException': {
            var e = new OakRowLockedException(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakRowUnexistedException': {
            var e = new OakRowUnexistedException(data.rows);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakDeadlock': {
            var e = new OakDeadlock(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakDataException': {
            var e = new OakDataException(data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakNoRelationDefException': {
            var e = new OakNoRelationDefException(data.entity, data.action, data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakUniqueViolationException': {
            var e = new OakUniqueViolationException(data.rows, data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakImportDataParseException': {
            var e = new OakImportDataParseException(data.message, data.line, data.header);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakPreConditionUnsetException': {
            var e = new OakPreConditionUnsetException(data.message, data.entity, data.code);
            e.setOpRecords(data.opRecords);
            return e;
        }
        case 'OakAttrNotNullException': {
            var e = new OakAttrNotNullException(data.entity, data.attributes, data.message);
            e.setOpRecords(data.opRecords);
            return e;
        }
        default:
            return;
    }
}
exports.makeException = makeException;
