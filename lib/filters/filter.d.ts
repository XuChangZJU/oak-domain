import { DeduceFilter, EntityDef } from "../types/Entity";
import { TriggerEntityShape } from "../types/Trigger";
export declare function addFilterSegment<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends TriggerEntityShape>(filter: DeduceFilter<E, ED, T, SH>, segment: DeduceFilter<E, ED, T, SH>): void;
