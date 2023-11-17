import { ActionDictOfEntityDict, BBWatcher, Checker, EntityDict, StorageSchema, Trigger } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { EntityDict as BaseEntityDict } from '../base-app-domain/EntityDict';
export declare function getFullProjection<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>): ED[T]["Selection"]["data"];
export declare function makeIntrinsicCTWs<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>): {
    triggers: Trigger<ED, keyof ED, Cxt>[];
    checkers: Checker<ED, keyof ED, Cxt | FrontCxt>[];
    watchers: BBWatcher<ED, keyof ED>[];
};
