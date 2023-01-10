import { EntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';
import { StorageSchema, EntityDict as BaseEntityDict, Checker } from '../types';
export declare function createDynamicCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): Checker<ED, keyof ED, Cxt>[];
