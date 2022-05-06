import assert from 'assert';
import { assign, cloneDeep, intersection, keys } from "lodash";
import { StorageSchema } from '../types';
import { DeduceFilter, EntityDict } from "../types/Entity";

export function addFilterSegment<ED extends EntityDict, T extends keyof ED>(segment2: ED[T]['Selection']['filter'], filter2?: ED[T]['Selection']['filter']) {
    const filter: ED[T]['Selection']['filter'] = filter2 ? cloneDeep(filter2) : {};
    const segment: ED[T]['Selection']['filter'] = segment2 ? cloneDeep(segment2) : {};
    if (intersection(keys(filter), keys(segment)).length > 0) {
        if (filter!.hasOwnProperty('$and')) {
            filter!.$and!.push(segment!);
        }
        else {
            assign(filter, {
                $and: [segment],
            });
        }
    }
    else {
        assign(filter, segment);
    }

    return filter;
}

export function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>) {
    return filters.reduce(addFilterSegment);
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