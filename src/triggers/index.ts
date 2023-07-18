import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict } from '../types';
import { createModiRelatedTriggers } from '../store/modi';
import { AsyncContext } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';

export function createDynamicTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    return createModiRelatedTriggers<ED, Cxt>(schema);
}
