import { AuthDefDict, Checker, EntityDict, OperateOption, SelectOption, StorageSchema, Trigger } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from './SyncRowStore';
export declare function translateCheckerInAsyncContext<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(checker: Checker<ED, keyof ED, Cxt>): {
    fn: Trigger<ED, keyof ED, Cxt>['fn'];
    when: 'before' | 'after';
};
export declare function translateCheckerInSyncContext<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED>>(checker: Checker<ED, T, Cxt>): {
    fn: (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
    when: 'before' | 'after';
};
export declare function createAuthCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>, authDict: AuthDefDict<ED>): Checker<ED, keyof ED, Cxt>[];
