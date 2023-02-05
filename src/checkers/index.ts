import { EntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
import { createAuthCheckers, createRemoveCheckers } from '../store/checker';
import { createModiRelatedCheckers } from '../store/modi';
import { SyncContext } from '../store/SyncRowStore';
import { StorageSchema, EntityDict as BaseEntityDict, Checker, AuthDef, AuthDefDict } from '../types';

export function createDynamicCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>, authDict?: AuthDefDict<ED>){
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];
    checkers.push(...createModiRelatedCheckers<ED, Cxt>(schema));
    checkers.push(...createRemoveCheckers<ED, Cxt>(schema, authDict));
    if (authDict) {
        checkers.push(...createAuthCheckers<ED, Cxt>(schema, authDict));
    }
    return checkers;
}
