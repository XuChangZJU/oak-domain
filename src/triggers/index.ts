import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict, Context } from '../types';
import modiTriggers from './modi';
import { createModiRelatedTriggers } from '../store/modi';

export default [...modiTriggers];

export function createDynamicTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>) {
    return createModiRelatedTriggers<ED, Cxt>(schema);
}
