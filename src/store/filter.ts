import assert from 'assert';
import { assign, cloneDeep, intersection, keys } from "lodash";
import { DeduceFilter, EntityDict } from "../types/Entity";

export function addFilterSegment<ED extends EntityDict, T extends keyof ED>(segment: ED[T]['Selection']['filter'], filter2?: ED[T]['Selection']['filter']) {
    const filter: ED[T]['Selection']['filter'] = filter2 ? cloneDeep(filter2) : {}; 
    assert(segment);
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
