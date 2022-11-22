import { ActionDictOfEntityDict, BBWatcher, Checker, EntityDict, StorageSchema, Trigger } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
export declare function getFullProjection<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>): ED[T]["Selection"]["data"];
export declare function analyzeActionDefDict<ED extends EntityDict, Cxt extends SyncContext<ED> | AsyncContext<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>): {
    triggers: Trigger<ED, keyof ED, Cxt>[];
    checkers: Checker<ED, keyof ED, Cxt>[];
    watchers: BBWatcher<ED, keyof ED>[];
};
