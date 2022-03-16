import { DeduceFilter, EntityDef } from "../types/Entity";
export declare function addFilterSegment<ED extends {
    [E: string]: EntityDef;
}, T extends keyof ED>(segment: DeduceFilter<ED[T]['Schema']>, filter2?: DeduceFilter<ED[T]['Schema']>): DeduceFilter<ED[T]["Schema"]>;
