import { EntityDef } from "../types/Entity";
import { StorageSchema } from "../types/Storage";
/**
 * 判断对象和属性之间的关系
 * @param schema
 * @param entity
 * @param attr
 * @param row
 * @returns
 */
export declare function judgeRelation<ED extends {
    [E: string]: EntityDef;
}>(schema: StorageSchema<ED>, entity: keyof ED, attr: string): string | string[] | 1 | 0 | 2;
