import { ActionDictOfEntityDict, Checker, Context, DeduceFilter, EntityDict, StorageSchema, Trigger } from "../types";
export declare function getFullProjection<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>): ED[T]["Selection"]["data"];
export declare function checkFilterContains<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>>(entity: T, schema: StorageSchema<ED>, contained: DeduceFilter<ED[T]['Schema']>, context: Cxt, filter?: DeduceFilter<ED[T]['Schema']>): Promise<void>;
export declare function analyzeActionDefDict<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>): {
    triggers: Trigger<ED, keyof ED, Cxt>[];
    checkers: Checker<ED, keyof ED, Cxt>[];
};
