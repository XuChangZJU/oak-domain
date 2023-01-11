import { Checker, EntityDict, ExpressionRelationChecker, OperateOption, SelectOption, StorageSchema, Trigger } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from './SyncRowStore';
export declare function translateCheckerInAsyncContext<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(checker: Checker<ED, keyof ED, Cxt>): Trigger<ED, keyof ED, Cxt>['fn'];
export declare function translateCheckerInSyncContext<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED>>(checker: Checker<ED, T, Cxt>): (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
export declare function createRelationHierarchyCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): ExpressionRelationChecker<ED, keyof ED, Cxt>[];
