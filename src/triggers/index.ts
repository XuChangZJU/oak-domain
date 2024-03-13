import assert from 'assert';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict, Trigger, CreateTrigger } from '../types';
import { createModiRelatedTriggers } from '../store/modi';
import { AsyncContext } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';

/* function createOperTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>() {
    return [
        {
            name: 'assign initial bornAt for local oper',
            entity: 'oper',
            action: 'create',
            when: 'before',
            fn({ operation }) {
                const { data } = operation;
                assert(!(data instanceof Array));
                if (!data.bornAt) {
                    data.bornAt = Date.now();
                }
                return 1;
            }            
        } as CreateTrigger<ED, 'oper', Cxt>
    ] as Trigger<ED, keyof ED, Cxt>[];
} */

export function createDynamicTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    return createModiRelatedTriggers<ED, Cxt>(schema);
}
