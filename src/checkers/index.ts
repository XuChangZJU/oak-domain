import { EntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
import { createRelationHierarchyCheckers } from '../store/checker';
import { createModiRelatedCheckers } from '../store/modi';
import { SyncContext } from '../store/SyncRowStore';
import { StorageSchema, EntityDict as BaseEntityDict, Checker } from '../types';

export function createDynamicCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>){
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];
    checkers.push(...createModiRelatedCheckers<ED, Cxt>(schema));
    checkers.push(...createRelationHierarchyCheckers<ED, Cxt>(schema));
    return checkers;
}
