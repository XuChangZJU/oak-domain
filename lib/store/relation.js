"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeRelation = void 0;
var assert_1 = __importDefault(require("assert"));
var Demand_1 = require("../types/Demand");
var Entity_1 = require("../types/Entity");
/**
 * 判断对象和属性之间的关系
 * @param schema
 * @param entity
 * @param attr
 * @param row
 * @returns
 */
function judgeRelation(schema, entity, attr) {
    var _a = schema, _b = entity, attributes = _a[_b].attributes;
    if (attr.startsWith(Demand_1.EXPRESSION_PREFIX) || attr.startsWith('#')) {
        // 表达式属性或者metadata
        return 0;
    }
    if (attributes.hasOwnProperty(attr) || Entity_1.initinctiveAttributes.includes(attr)) {
        // 原生属性
        return 1;
    }
    if (attr.includes('$')) {
        var entity2 = attr.slice(0, attr.indexOf('$'));
        (0, assert_1.default)(schema.hasOwnProperty(entity2));
        var foreignKey = attr.slice(attr.indexOf('$') + 1);
        var _c = schema, _d = entity2, attributes2 = _c[_d].attributes;
        if (foreignKey === 'entity') {
            // 基于反指对象的反向关联
            return [entity2];
        }
        else if (attributes2.hasOwnProperty("".concat(foreignKey, "Id"))
            && attributes2["".concat(foreignKey, "Id")].type === 'ref'
            && attributes2["".concat(foreignKey, "Id")].ref === entity) {
            // 基于外键的反向关联
            return [entity2, "".concat(foreignKey, "Id")];
        }
        else {
            // 这种情况应该不会跑到
            (0, assert_1.default)(false);
        }
    }
    else if ((attributes.hasOwnProperty("".concat(attr, "Id")))) {
        var _e = attributes["".concat(attr, "Id")], type = _e.type, ref = _e.ref;
        (0, assert_1.default)(type === 'ref');
        return ref;
    }
    else if (attributes.hasOwnProperty('entity')
        && attributes.hasOwnProperty('entityId')
        && schema.hasOwnProperty(attr)) {
        // 反向指针的外键
        return 2;
    }
    else {
        (0, assert_1.default)(Entity_1.initinctiveAttributes.includes(attr), "".concat(attr, "\u5C5E\u6027\u627E\u4E0D\u5230"));
        return 1;
    }
}
exports.judgeRelation = judgeRelation;
