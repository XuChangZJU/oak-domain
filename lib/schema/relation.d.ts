import { StorageSchema } from "../types/Storage";
/**
 * 判断对象和属性之间的关系
 * @param schema
 * @param entity
 * @param attr
 * @param row
 * @returns
 */
export declare function judgeRelation(schema: StorageSchema, entity: string, attr: string): string | string[] | 1 | 0 | 2;
