import { EntityDict as BaseEntityDict, StorageSchema } from '../types';
import { EntityDict } from "../base-app-domain";
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';
export declare function combineFilters<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filters: Array<ED[T]['Selection']['filter']>, union?: true): ED[T]["Selection"]["filter"] | undefined;
type DeducedFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED> = {
    entity: T;
    filter: ED[T]['Selection']['filter'];
};
type DeducedFilterCombination<ED extends EntityDict & BaseEntityDict> = {
    $or?: (DeducedFilterCombination<ED> | DeducedFilter<ED, keyof ED>)[];
    $and?: (DeducedFilterCombination<ED> | DeducedFilter<ED, keyof ED>)[];
};
/**
 * 在以下判断相容或相斥的过程中，相容/相斥的事实标准是：满足两个条件的查询集合是否被包容/互斥，但如果两个filter在逻辑上相容或者相斥，在事实上不一定相容或者相斥
 * 例如：{ a: 1 } 和 { a: { $ne: 1 } } 是明显不相容的查询，但如果数据为空集，则这两个查询并不能否定其相容
 * 我们在处理这类数据时，优先使用逻辑判定的结果（更符合查询本身的期望而非真实数据集），同时也可减少对真实数据集不必要的查询访问
 */
/**
 * 判断value1表达的单个属性查询与同属性上value2表达的查询是包容还是相斥
 * 相容即value1所表达的查询结果一定被value2表达的查询结果所包含，例如：
 * value1: {
 *  $eq: 12
 * }
 * value2: {
 *  $gt: 8,
 * }
 * 此时value1相容value2
 *
 * 相斥即value1所表达的查询结果与value2一定毫无联系，例如：
 * value1: {
 *  $gt: 8,
 * }
 * value2: {
 *  $lt: 2,
 * }
 *
 *
 * @param value1
 * @param value2
 * @return true代表肯定相容/相斥，false代表肯定不相容/不相斥，undefined代表不能确定
 * @attention: 1)这里的测试不够充分，有些算子之间的相容或相斥可能有遗漏, 2)有新的算子加入需要修改代码
 */
export declare function judgeValueRelation(value1: any, value2: any, contained: boolean): boolean | undefined;
/**
 *
 * 判断filter是否包含contained中的查询条件，即filter查询的结果一定是contained查询结果的子集
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
 * @param contained
 * @returns
 */
export declare function contains<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter: ED[T]['Selection']['filter'], contained: ED[T]['Selection']['filter']): boolean | DeducedFilterCombination<ED>;
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
export declare function repel<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter1: ED[T]['Selection']['filter'], filter2: ED[T]['Selection']['filter']): boolean | DeducedFilterCombination<ED>;
/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter
 * @returns
 */
export declare function getRelevantIds<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(filter: ED[T]['Selection']['filter']): string[];
/**
 * 判断两个过滤条件是否完全一致
 * @param entity
 * @param schema
 * @param filter1
 * @param filter2
 */
export declare function same<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>, filter1: ED[T]['Selection']['filter'], filter2: ED[T]['Selection']['filter']): boolean;
/**
 * 寻找在树形结构中满足条件的数据行的上层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更高层的“浙江省”和“中国”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
export declare function makeTreeAncestorFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, parentKey: string, filter: ED[T]['Selection']['filter'], level?: number, includeAll?: boolean, includeSelf?: boolean): ED[T]['Selection']['filter'];
/**
 * 寻找在树形结构中满足条件的数据行的下层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更低层的“西湖区”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
export declare function makeTreeDescendantFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, parentKey: string, filter: ED[T]['Selection']['filter'], level?: number, includeAll?: boolean, includeSelf?: boolean): ED[T]['Selection']['filter'];
export declare function checkDeduceFilters<ED extends EntityDict & BaseEntityDict, Cxt extends SyncContext<ED> | AsyncContext<ED>>(dfc: DeducedFilterCombination<ED>, context: Cxt): boolean | Promise<boolean>;
/**
 * 检查filter是否包含contained（filter查询的数据是contained查询数据的子集）
 * @param entity
 * @param context
 * @param contained
 * @param filter
 * @param dataCompare
 * @returns
 */
export declare function checkFilterContains<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(entity: T, context: Cxt, contained: ED[T]['Selection']['filter'], filter?: ED[T]['Selection']['filter'], dataCompare?: true): boolean | Promise<boolean>;
export declare function checkFilterRepel<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(entity: T, context: Cxt, filter1: ED[T]['Selection']['filter'], filter2: ED[T]['Selection']['filter'], dataCompare?: true): boolean | Promise<boolean>;
export {};
