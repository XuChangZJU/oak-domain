import { StorageSchema } from '../types';
import { EntityDict } from "../types/Entity";
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
                    else if(k === '$or') {
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

export function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>) {
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