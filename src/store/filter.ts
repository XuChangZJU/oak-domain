import assert from 'assert';
import { assign, cloneDeep, intersection, keys } from "lodash";
import { DeduceFilter, EntityDict } from "../types/Entity";

export function addFilterSegment<ED extends EntityDict, T extends keyof ED>(segment: DeduceFilter<ED[T]['Schema']>, filter2?: DeduceFilter<ED[T]['Schema']>) {
    const filter: DeduceFilter<ED[T]['Schema']> = filter2 ? cloneDeep(filter2) : {}; 
    assert(segment);
    if (intersection(keys(filter), keys(segment)).length > 0) {
        if (filter.hasOwnProperty('$and')) {
            filter.$and!.push(segment!);
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

export function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<DeduceFilter<ED[T]['Schema']>>) {
    return filters.reduce(addFilterSegment);
}
