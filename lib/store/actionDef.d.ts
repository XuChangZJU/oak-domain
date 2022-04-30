import { ActionDictOfEntityDict, Checker, Context, EntityDict, StorageSchema, Trigger } from "../types";
export declare function analyzeActionDefDict<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>): {
    triggers: Trigger<ED, keyof ED, Cxt>[];
    checkers: Checker<ED, keyof ED, Cxt>[];
};
