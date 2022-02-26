import { assert } from "console";
import { assign, cloneDeep, intersection, keys } from "lodash";
import { DeduceFilter, EntityDef, EntityShape } from "../types/Entity";
import { TriggerEntityShape } from "../types/Trigger";

export function addFilterSegment<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends TriggerEntityShape>(segment: DeduceFilter<E, ED, T, SH>, filter2?: DeduceFilter<E, ED, T, SH>) {
    const filter: DeduceFilter<E, ED, T, SH> = filter2 ? cloneDeep(filter2) : {}; 
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
