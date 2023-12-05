"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeRelation = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const Demand_1 = require("../types/Demand");
const Entity_1 = require("../types/Entity");
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
    if (attributes.hasOwnProperty(attr) || Entity_1.initinctiveAttributes.includes(attr)) {
        // 原生属性
        return 1;
    }
    if (attr.includes('$')) {
        const firstDelimiter = attr.indexOf('$');
        const entity2 = attr.slice(0, firstDelimiter);
        (0, assert_1.default)(schema.hasOwnProperty(entity2));
        const secondDelemiter = attr.indexOf('$', firstDelimiter + 1);
        const foreignKey = attr.slice(firstDelimiter + 1, secondDelemiter > 0 ? secondDelemiter : attr.length);
        const { [entity2]: { attributes: attributes2 } } = schema;
        if (foreignKey === 'entity') {
            // 基于反指对象的反向关联
            return [entity2];
        }
        else if (attributes2.hasOwnProperty(`${foreignKey}Id`)
            && attributes2[`${foreignKey}Id`].type === 'ref'
            && attributes2[`${foreignKey}Id`].ref === entity) {
            // 基于外键的反向关联
            return [entity2, `${foreignKey}Id`];
        }
        else {
            // 这种情况应该不会跑到
            (0, assert_1.default)(false);
        }
    }
    else if ((attributes.hasOwnProperty(`${attr}Id`))) {
        const { type, ref } = attributes[`${attr}Id`];
        if (type === 'ref') {
            return ref;
        }
        return 1;
    }
    else if (attributes.hasOwnProperty('entity')
        && attributes.hasOwnProperty('entityId')
        && schema.hasOwnProperty(attr)) {
        (0, assert_1.default)(attributes.entity.ref.includes(attr), '不应当出现的case');
        // 反向指针的外键
        return 2;
    }
    else {
        (0, assert_1.default)(Entity_1.initinctiveAttributes.includes(attr), `${entity}对象中的${attr}属性找不到`);
        return 1;
    }
}
exports.judgeRelation = judgeRelation;
