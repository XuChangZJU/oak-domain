import { ActionDictOfEntityDict, Checker, EntityDict, StorageSchema, Trigger, Watcher, AttrUpdateMatrix } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { EntityDict as BaseEntityDict } from '../base-app-domain/EntityDict';
export declare function makeIntrinsicCTWs<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>, attrUpdateMatrix?: AttrUpdateMatrix<ED>): {
    triggers: Trigger<ED, keyof ED, Cxt>[];
    checkers: Checker<ED, keyof ED, Cxt | FrontCxt>[];
    watchers: Watcher<ED, keyof ED, Cxt>[];
};
