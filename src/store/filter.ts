import assert from 'assert';
import { OakRowInconsistencyException, StorageSchema } from '../types';
import { DeduceFilter, EntityDict } from "../types/Entity";
import { intersection, union } from '../utils/lodash';
import { getFullProjection } from './actionDef';
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';
export function addFilterSegment<ED extends EntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]) {
    const filter: ED[T]['Selection']['filter'] = {};
    filters.forEach(
        ele => {
            if (ele) {
                for (const k in ele) {
                    if (k === '$and') {
                        if (filter.$and) {
                            filter.$and.push(...(ele[k] as any));
                        }
                        else {
                            filter.$and = ele[k];
                        }
                    }
                    else if (k === '$or') {
                        if (filter.$or) {
                            filter.$or.push(...(ele[k] as any));
                        }
                        else {
                            filter.$or = ele[k];
                        }
                    }
                    else if (filter.hasOwnProperty(k)) {
                        if (filter.$and) {
                            filter.$and.push({
                                [k]: ele[k],
                            })
                        }
                        else {
                            filter.$and = [
                                {
                                    [k]: ele[k],
                                }
                            ]
                        }
                    }
                    else {
                        filter[k] = ele[k];
                    }
                }
            }
        }
    );

    return filter;
}

export function unionFilterSegment<ED extends EntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]) {
    let allOnlyOneOr = true;
    for (const f of filters) {
        if (Object.keys(f!).length > 1 || !f!.$or) {
            allOnlyOneOr = false;
            break;
        }
    }
    if (allOnlyOneOr) {
        // 优化特殊情况，全部都是$or，直接合并
        const ors = filters.map(
            ele => ele!.$or
        );
        return {
            $or: ors.reduce((prev, next) => prev!.concat(next!), [])
        } as ED[T]['Selection']['filter'];
    }

    return {
        $or: filters,
    } as ED[T]['Selection']['filter'];
}

export function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>, union?: true) {
    if (union) {
        return unionFilterSegment(...filters);
    }
    return addFilterSegment(...filters);
}

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
export function contains<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter: ED[T]['Selection']['filter'],
    conditionalFilter: ED[T]['Selection']['filter']) {
    // todo
    return false;
}


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
export function repel<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter']) {
    // todo
    return false;
}

/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter 
 * @returns 
 */
export function getRelevantIds<ED extends EntityDict, T extends keyof ED>(filter: ED[T]['Selection']['filter']): string[] {
    let ids: string[] | undefined;
    let idsAnd: string[] | undefined;
    let idsOr: string[] | undefined;

    if (!filter) {
        return [];
    }

    // 因为要准确判定id，如果有其它的过滤条件，可能会使实际处理的行数少于id指向的行数，只能返回空数组
    const attrs = Object.keys(filter);
    if (intersection(attrs, ['id', '$and', '$or']).length > 3) {
        return [];
    }

    if (filter?.$and) {
        const idss = filter.$and.map(
            ele => getRelevantIds(ele)
        );
        idsAnd = intersection(...idss);
    }

    if (filter?.$or) {
        const idss = filter.$or.map(
            ele => getRelevantIds(ele)
        );
        idsOr = union(...idss);
    }

    if (filter?.id) {
        if (typeof filter.id === 'string') {
            ids = [filter.id];
        }
        if (filter.id?.$eq) {
            ids = [filter.id.$eq as string];
        }
        if (filter.id?.$in && filter.id.$in instanceof Array) {
            ids = filter.id.$in;
        }
    }

    // 三者如果有基一，直接返回，如果大于一返回intersection
    if (!ids && !idsAnd && !idsOr) {
        return [];
    }
    let result = (ids || idsAnd || idsOr) as string[];
    if (ids) {
        result = intersection(result, ids);
    }
    if (idsAnd) {
        result = intersection(result, idsAnd);
    }
    if (idsOr) {
        result = intersection(result, idsOr);
    }

    return result;
}

/**
 * 判断两个过滤条件是否完全一致
 * @param entity 
 * @param schema 
 * @param filter1 
 * @param filter2 
 */
export function same<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter']) {
    // 当前只需要判断是不是id相等就行了，在runningTree的operation合并的时间使用
    if (!filter1 || !filter1.id || Object.keys(filter1).length > 1 || !filter2 || !filter2.id || Object.keys(filter2).length > 1) {
        return false;
    }
    return filter1.id === filter2.id;
}

/**
 * 寻找在树形结构中满足条件的数据行的上层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更高层的“浙江省”和“中国”，即可构造出满足条件的filter
 * @param entity 
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level 
 */
export function makeTreeAncestorFilter<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    parentKey: string,
    filter: ED[T]['Selection']['filter'],
    level: number = 1,
    includeAll?: boolean,
    includeSelf?: boolean): ED[T]['Selection']['filter'] {
    assert(level >= 0);
    let idInFilters: ED[T]['Selection']['filter'][] = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    let currentLevelInFilter: ED[T]['Selection']['filter'] = filter;
    while (level > 0) {
        currentLevelInFilter = {
            id: {
                $in: {
                    entity,
                    data: {
                        [parentKey]: 1,
                    },
                    filter: currentLevelInFilter,
                }
            },
        };
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    };
    if (includeAll) {
        return {
            $or: idInFilters,
        } as ED[T]['Selection']['filter'];
    }
    return currentLevelInFilter;
}

/**
 * 寻找在树形结构中满足条件的数据行的下层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更低层的“西湖区”，即可构造出满足条件的filter
 * @param entity 
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level 
 */
export function makeTreeDescendantFilter<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    parentKey: string,
    filter: ED[T]['Selection']['filter'],
    level: number = 1,
    includeAll?: boolean,
    includeSelf?: boolean): ED[T]['Selection']['filter'] {
    assert(level >= 0);
    assert(parentKey.endsWith('Id'));
    const parentKeyRef = parentKey.slice(0, parentKey.length - 2);
    let idInFilters: ED[T]['Selection']['filter'][] = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    let currentLevelInFilter: ED[T]['Selection']['filter'] = filter;
    while (level > 0) {
        currentLevelInFilter = {
            [parentKeyRef]: currentLevelInFilter,
        };
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    };
    if (includeAll) {
        return {
            $or: idInFilters,
        } as ED[T]['Selection']['filter'];
    }
    return currentLevelInFilter;
}

export function checkFilterContains<ED extends EntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    entity: T,
    context: Cxt,
    contained: ED[T]['Selection']['filter'],
    filter?: ED[T]['Selection']['filter']): boolean | Promise<boolean> {
    if (!filter) {
        throw new OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    // 优先判断两个条件是否相容
    if (contains(entity, schema, filter, contained)) {
        return true;
    }
    // 再判断加上了conditionalFilter后取得的行数是否缩减
    const filter2 = combineFilters([filter, {
        $not: contained,
    }]);
    const count = context.count(entity, {
        filter: filter2,
    }, {
        dontCollect: true,
    });
    if (count instanceof Promise) {
        return count.then(
            (count2) => count2 === 0
        );
    }
    return count === 0;
}