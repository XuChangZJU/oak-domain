import { StorageSchema } from '../types';
import { EntityDict } from "../types/Entity";
export declare function addFilterSegment<ED extends EntityDict, T extends keyof ED>(segment2: ED[T]['Selection']['filter'], filter2?: ED[T]['Selection']['filter']): ED[T]["Selection"]["filter"];
export declare function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>): ED[T]["Selection"]["filter"];
/**
 * 判断filter是否包含conditionalFilter中的查询条件，即filter查询的结果一定满足conditionalFilter的约束
 * filter = {
 *      a: 1
 *      b: 2,
 *      c: 3,
 * },
 * conditionalFilter = {
 *      a: 1
 * }
 * 则包含
 * @param entity
 * @param schema
 * @param filter
 * @param conditionalFilter
 */
export declare function contains<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter: ED[T]['Selection']['filter'], conditionalFilter: ED[T]['Selection']['filter']): boolean;
