import assert from "assert";
import { EntityDict } from "../base-app-domain";
import { EXPRESSION_PREFIX } from "../types/Demand";
import { EntityDict as BaseEntityDict, initinctiveAttributes } from "../types/Entity";
import { StorageSchema } from "../types/Storage";

/**
 * 判断对象和属性之间的关系
 * @param schema 
 * @param entity 
 * @param attr 
 * @param row 
 * @returns 
 */
export function judgeRelation<ED extends EntityDict & BaseEntityDict>(schema: StorageSchema<ED>, entity: keyof ED, attr: string) {
    const { [entity]: { attributes } } = schema;

    if (attr.startsWith(EXPRESSION_PREFIX) || attr.startsWith('#')) {
        // 表达式属性或者metadata
        return 0;
    }

    if (attributes.hasOwnProperty(attr) || initinctiveAttributes.includes(attr)) {
        // 原生属性
        return 1;
    }

    if (attr.includes('$')) {
        const firstDelimiter = attr.indexOf('$');        
        const entity2 = attr.slice(0, firstDelimiter);
        assert (schema.hasOwnProperty(entity2));
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
            assert(false);
        }
    }
    else if ((attributes.hasOwnProperty(`${attr}Id`))){
        const { type, ref } = attributes[`${attr}Id`];
        if (type === 'ref') {
            return ref!;
        }
        return 1;
    }
    else if (attributes.hasOwnProperty('entity')
        && attributes.hasOwnProperty('entityId')
        && schema.hasOwnProperty(attr)) {
        assert(attributes.entity.ref!.includes(attr), '不应当出现的case');
        // 反向指针的外键
        return 2;
    }
    else {
        assert(initinctiveAttributes.includes(attr), `${entity as string}对象中的${attr}属性找不到`);
        return 1;
    }
}