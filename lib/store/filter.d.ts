import { DeduceFilter, EntityDict } from "../types/Entity";
export declare function addFilterSegment<ED extends EntityDict, T extends keyof ED>(segment: DeduceFilter<ED[T]['Schema']>, filter2?: DeduceFilter<ED[T]['Schema']>): DeduceFilter<ED[T]["Schema"]>;
export declare function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<DeduceFilter<ED[T]['Schema']>>): DeduceFilter<ED[T]["Schema"]>;
