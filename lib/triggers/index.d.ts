import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict, Trigger } from '../types';
import { AsyncContext } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';
export declare function createDynamicTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): Trigger<ED, keyof ED, Cxt>[];
