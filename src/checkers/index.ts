import { EntityDict } from '../base-app-domain';
import { createModiRelatedCheckers } from '../store/modi';
import { StorageSchema, EntityDict as BaseEntityDict, Context } from '../types';

export function createCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>){
    return createModiRelatedCheckers<ED, Cxt>(schema);
}
