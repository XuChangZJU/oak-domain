import { EntityDict } from "../types/Entity";
export declare function addFilterSegment<ED extends EntityDict, T extends keyof ED>(segment: ED[T]['Selection']['filter'], filter2?: ED[T]['Selection']['filter']): ED[T]["Selection"]["filter"];
export declare function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>): ED[T]["Selection"]["filter"];
