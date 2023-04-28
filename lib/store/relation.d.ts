import { EntityDict } from "../base-app-domain";
import { EntityDict as BaseEntityDict } from "../types/Entity";
import { StorageSchema } from "../types/Storage";
/**
 * 判断对象和属性之间的关系
 * @param schema
 * @param entity
 * @param attr
 * @param row
 * @returns
 */
export declare function judgeRelation<ED extends EntityDict & BaseEntityDict>(schema: StorageSchema<ED>, entity: keyof ED, attr: string): string | 1 | 2 | string[] | 0;
