"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeException = exports.OakExternalException = exports.OakPreConditionUnsetException = exports.OakDeadlock = exports.OakCongruentRowExists = exports.OakRowLockedException = exports.OakUnloggedInException = exports.OakUserInvisibleException = exports.OakUserUnpermittedException = exports.OakAttrCantUpdateException = exports.OakAttrNotNullException = exports.OakInputIllegalException = exports.OakRowInconsistencyException = exports.OakServerProxyException = exports.OakNetworkException = exports.OakUserException = exports.OakRowUnexistedException = exports.OakOperExistedException = exports.OakNoRelationDefException = exports.OakImportDataParseException = exports.OakUniqueViolationException = exports.OakDataException = exports.OakMakeSureByMySelfException = exports.OakException = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
class OakException extends Error {
    opRecord;
    constructor(message) {
        super(message);
        this.name = new.target.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, new.target);
        }
        if (typeof Object.setPrototypeOf === 'function') {
            Object.setPrototypeOf(this, new.target.prototype);
        }
        else {
            this.__proto__ = new.target.prototype;
        }
        this.opRecord = {
            a: 's',
            d: {},
        };
    }
    addData(entity, rows) {
        const { d } = this.opRecord;
        const addSingleRow = (rowRoot, row) => {
            const { id } = row;
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
        rows.forEach(row => addSingleRow(d[entity], row));
    }
    setOpRecords(opRecord) {
        this.opRecord = opRecord;
    }
    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            opRecord: this.opRecord,
        });
    }
}
exports.OakException = OakException;
// 这个异常表示模块自己处理跨事务一致性，框架pass（在分布式数据传递时会用到）
class OakMakeSureByMySelfException extends OakException {
}
exports.OakMakeSureByMySelfException = OakMakeSureByMySelfException;
class OakDataException extends OakException {
}
exports.OakDataException = OakDataException;
class OakUniqueViolationException extends OakException {
    rows;
    constructor(rows, message) {
        super(message || '您更新的数据违反了唯一性约束');
        this.rows = rows;
    }
}
exports.OakUniqueViolationException = OakUniqueViolationException;
class OakImportDataParseException extends OakException {
    line;
    header;
    // message必传，描述具体错误的数据内容
    constructor(message, line, header) {
        super(message);
        this.line = line;
        this.header = header;
    }
}
exports.OakImportDataParseException = OakImportDataParseException;
class OakNoRelationDefException extends OakDataException {
    entity;
    actions;
    constructor(entity, actions, msg) {
        super(msg || `对象${entity}的操作${actions.join(',')}找不到有效的relation定义`);
        this.entity = entity;
        this.actions = actions;
    }
    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            entity: this.entity,
            action: this.actions,
        });
    }
}
exports.OakNoRelationDefException = OakNoRelationDefException;
class OakOperExistedException extends OakDataException {
}
exports.OakOperExistedException = OakOperExistedException;
class OakRowUnexistedException extends OakDataException {
    rows;
    // 指定主键查询时却发现行不存在，一般发生在缓存中
    constructor(rows) {
        super(`查询${rows.map(ele => ele.entity).join(',')}对象时发现了空指针，请检查数据一致性`);
        this.rows = rows;
    }
    toString() {
        return JSON.stringify({ rows: this.rows });
    }
    getRows() {
        return this.rows;
    }
}
exports.OakRowUnexistedException = OakRowUnexistedException;
/**
 * 可接受的、由用户操作造成的异常
 */
class OakUserException extends OakException {
}
exports.OakUserException = OakUserException;
;
/**
 * 网络中断异常
 */
class OakNetworkException extends OakException {
}
exports.OakNetworkException = OakNetworkException;
// 
class OakServerProxyException extends OakException {
}
exports.OakServerProxyException = OakServerProxyException;
// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
class OakRowInconsistencyException extends OakUserException {
    constructor(data, message) {
        super(message);
        (0, assert_1.default)(!data, '现在使用addData接口来传数据');
    }
    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
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
    entity;
    constructor(entity, attributes, message) {
        super(message);
        this.entity = entity;
        this.attributes = attributes;
    }
    getEntity() {
        return this.entity;
    }
    getAttributes() {
        return this.attributes;
    }
    addAttributesPrefix(prefix) {
        this.attributes = this.attributes.map(ele => `${prefix}.${ele}`);
    }
    toString() {
        return JSON.stringify({
            entity: this.entity,
            name: this.constructor.name,
            message: this.message,
            attributes: this.attributes,
        });
    }
}
exports.OakInputIllegalException = OakInputIllegalException;
;
/**
 * 属性为空时抛的异常
 */
class OakAttrNotNullException extends OakInputIllegalException {
    constructor(entity, attributes, message) {
        super(entity, attributes, message || `属性[${attributes.join(',')}]不允许为空`);
    }
}
exports.OakAttrNotNullException = OakAttrNotNullException;
/**
 * 属性不允许更新抛的异常，前端可以用这个异常来处理update时对应属性的露出
 */
class OakAttrCantUpdateException extends OakInputIllegalException {
    constructor(entity, attributes, message) {
        super(entity, attributes, message || `属性[${attributes.join(',')}]不允许更新`);
    }
}
exports.OakAttrCantUpdateException = OakAttrCantUpdateException;
/**
 * 用户权限不够时抛的异常
 */
class OakUserUnpermittedException extends OakUserException {
    entity;
    operation;
    constructor(entity, operation, message) {
        super(message || '用户操作权限不足');
        this.entity = entity;
        this.operation = operation;
    }
    toString() {
        return JSON.stringify({
            entity: this.entity,
            name: this.constructor.name,
            message: this.message,
            operation: this.operation,
        });
    }
}
exports.OakUserUnpermittedException = OakUserUnpermittedException;
;
/**
 * 用户查询权限不够抛出异常
 */
class OakUserInvisibleException extends OakUserException {
    entity;
    operation;
    constructor(entity, operation, message) {
        super(message || '用户查询权限不足');
        this.entity = entity;
        this.operation = operation;
    }
    toString() {
        return JSON.stringify({
            entity: this.entity,
            name: this.constructor.name,
            message: this.message,
            operation: this.operation,
        });
    }
}
exports.OakUserInvisibleException = OakUserInvisibleException;
;
/**
 * 用户未登录抛的异常
 */
class OakUnloggedInException extends OakUserException {
    constructor(message) {
        super(message || '您尚未登录');
    }
}
exports.OakUnloggedInException = OakUnloggedInException;
;
/**
 * 用户未登录抛的异常
 */
class OakRowLockedException extends OakUserException {
    constructor(message) {
        super(message || '该行数据正在被更新中，请稍后再试');
    }
}
exports.OakRowLockedException = OakRowLockedException;
;
/**
 * 要插入行时，发现已经有相同的行数据
 */
class OakCongruentRowExists extends OakUserException {
    data;
    entity;
    constructor(entity, data, message) {
        super(message);
        this.data = data;
        this.entity = entity;
    }
    getData() {
        return this.data;
    }
    getEntity() {
        return this.entity;
    }
    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            data: this.data,
            entity: this.entity,
        });
    }
}
exports.OakCongruentRowExists = OakCongruentRowExists;
/**
 * 死锁抛的异常
 */
class OakDeadlock extends OakUserException {
    constructor(message) {
        super(message || '发现死锁');
    }
}
exports.OakDeadlock = OakDeadlock;
;
/**
 * 前置条件不满足抛的异常
 */
class OakPreConditionUnsetException extends OakUserException {
    entity;
    code;
    constructor(message, entity, code) {
        super(message || '前置条件不满足');
        this.entity = entity,
            this.code = code;
    }
    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            code: this.code,
            entity: this.entity,
        });
    }
}
exports.OakPreConditionUnsetException = OakPreConditionUnsetException;
/**
 * 调用外部接口抛出的异常
 */
class OakExternalException extends OakUserException {
    code;
    source;
    data;
    constructor(source, code, message, data) {
        super(message);
        this.code = code;
        this.source = source;
        this.data = data;
    }
    toString() {
        return JSON.stringify({
            code: this.code,
            message: this.message,
            source: this.source,
            data: this.data,
        });
    }
}
exports.OakExternalException = OakExternalException;
function makeException(data) {
    const { name } = data;
    let e = undefined;
    switch (name) {
        case 'OakException': {
            e = new OakException(data.message);
            break;
        }
        case 'OakUserException': {
            const e = new OakUserException(data.message);
            break;
        }
        case 'OakRowInconsistencyException': {
            const e = new OakRowInconsistencyException(data.data, data.message);
            break;
        }
        case 'OakInputIllegalException': {
            const e = new OakInputIllegalException(data.entity, data.attributes, data.message);
            break;
        }
        case 'OakAttrCantUpdateException': {
            const e = new OakAttrCantUpdateException(data.entity, data.attributes, data.message);
            break;
        }
        case 'OakUserUnpermittedException': {
            const e = new OakUserUnpermittedException(data.entity, data.operation, data.message);
            break;
        }
        case 'OakUserInvisibleException': {
            const e = new OakUserInvisibleException(data.entity, data.operation, data.message);
            break;
        }
        case 'OakUnloggedInException': {
            const e = new OakUnloggedInException(data.message);
            break;
        }
        case 'OakCongruentRowExists': {
            const e = new OakCongruentRowExists(data.entity, data.data, data.message);
            break;
        }
        case 'OakRowLockedException': {
            const e = new OakRowLockedException(data.message);
            break;
        }
        case 'OakRowUnexistedException': {
            const e = new OakRowUnexistedException(data.rows);
            break;
        }
        case 'OakDeadlock': {
            const e = new OakDeadlock(data.message);
            break;
        }
        case 'OakDataException': {
            const e = new OakDataException(data.message);
            break;
        }
        case 'OakNoRelationDefException': {
            const e = new OakNoRelationDefException(data.entity, data.action, data.message);
            break;
        }
        case 'OakUniqueViolationException': {
            const e = new OakUniqueViolationException(data.rows, data.message);
            break;
        }
        case 'OakImportDataParseException': {
            const e = new OakImportDataParseException(data.message, data.line, data.header);
            break;
        }
        case 'OakPreConditionUnsetException': {
            const e = new OakPreConditionUnsetException(data.message, data.entity, data.code);
            break;
        }
        case 'OakAttrNotNullException': {
            const e = new OakAttrNotNullException(data.entity, data.attributes, data.message);
            break;
        }
        case 'OakExternalException': {
            const e = new OakExternalException(data.source, data.code, data.message, data.data);
            break;
        }
        case 'OakNetworkException': {
            const e = new OakNetworkException(data.message);
            break;
        }
        case 'OakServerProxyException': {
            const e = new OakServerProxyException(data.message);
            break;
        }
        default:
            return;
    }
    if (e) {
        e.setOpRecords(data.opRecords);
        return e;
    }
}
exports.makeException = makeException;
