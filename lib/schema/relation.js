"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeRelation = void 0;
const assert_1 = __importDefault(require("assert"));
const Demand_1 = require("../types/Demand");
/**
 * 判断对象和属性之间的关系
 * @param schema
 * @param entity
 * @param attr
 * @param row
 * @returns
 */
function judgeRelation(schema, entity, attr) {
    const { [entity]: { attributes } } = schema;
    if (attr.startsWith(Demand_1.EXPRESSION_PREFIX) || attr.startsWith('#')) {
        // 表达式属性或者metadata
        return 0;
    }
    if (attributes.hasOwnProperty(attr)) {
        // 原生属性
        if (attributes[attr].type === 'ref') {
            return attributes[attr].ref; // 直接外键关联
        }
        return 1;
    }
    if (attr.includes('$')) {
        const entity2 = attr.slice(0, attr.indexOf('$'));
        (0, assert_1.default)(schema.hasOwnProperty(entity2));
        const foreignKey = attr.slice(attr.indexOf('$') + 1);
        const { [entity2]: { attributes: attributes2 } } = schema;
        if (foreignKey === 'entity') {
            // 基于反指对象的反向关联
            return [entity2];
        }
        else if (attributes2.hasOwnProperty(foreignKey)
            && attributes2[foreignKey].type === 'ref'
            && attributes2[foreignKey].ref === entity) {
            // 基于外键的反向关联
            return [entity2, foreignKey];
        }
        else {
            // 这种情况应该不会跑到
            (0, assert_1.default)(false);
        }
    }
    else if (attributes.hasOwnProperty('entity')
        && attributes.hasOwnProperty('entityId')
        && schema.hasOwnProperty(attr)) {
        // 反向指针的外键
        return 2;
    }
    else {
        // 派生属性
        return 1;
    }
}
exports.judgeRelation = judgeRelation;
