import { StorageSchema } from '../types';
import { EntityDict } from "../types/Entity";
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';
export declare function addFilterSegment<ED extends EntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]): ED[T]["Selection"]["filter"];
export declare function unionFilterSegment<ED extends EntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]): ED[T]["Selection"]["filter"];
export declare function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>, union?: true): ED[T]["Selection"]["filter"];
/**
 *
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
 * @returns
 */
export declare function contains<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter: ED[T]['Selection']['filter'], conditionalFilter: ED[T]['Selection']['filter']): boolean;
/**
 * 判断filter1和filter2是否相斥，即filter1和filter2查询的结果一定没有交集
 * filter1 = {
 *      a: 2
 * },
 * filter2 = {
 *      a: 1
 * }
 * 则包含
 * @param entity
 * @param schema
 * @param filter
 * @param conditionalFilter
 */
export declare function repel<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter1: ED[T]['Selection']['filter'], filter2: ED[T]['Selection']['filter']): boolean;
/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter
 * @returns
 */
export declare function getRelevantIds<ED extends EntityDict, T extends keyof ED>(filter: ED[T]['Selection']['filter']): string[];
/**
 * 判断两个过滤条件是否完全一致
 * @param entity
 * @param schema
 * @param filter1
 * @param filter2
 */
export declare function same<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter1: ED[T]['Selection']['filter'], filter2: ED[T]['Selection']['filter']): boolean;
/**
 * 寻找在树形结构中满足条件的数据行的上层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更高层的“浙江省”和“中国”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
export declare function makeTreeAncestorFilter<ED extends EntityDict, T extends keyof ED>(entity: T, parentKey: string, filter: ED[T]['Selection']['filter'], level?: number, includeAll?: boolean, includeSelf?: boolean): ED[T]['Selection']['filter'];
/**
 * 寻找在树形结构中满足条件的数据行的下层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更低层的“西湖区”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
export declare function makeTreeDescendantFilter<ED extends EntityDict, T extends keyof ED>(entity: T, parentKey: string, filter: ED[T]['Selection']['filter'], level?: number, includeAll?: boolean, includeSelf?: boolean): ED[T]['Selection']['filter'];
export declare function checkFilterContains<ED extends EntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(entity: T, context: Cxt, contained: ED[T]['Selection']['filter'], filter?: ED[T]['Selection']['filter']): boolean | Promise<boolean>;
