import { EntityDict } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema } from '../types/Storage';
import { AuthDefDict, RelationChecker } from '../types/Auth';
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';

export default class ArAuth<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>> {
    constructor(schema: StorageSchema<ED>,  authDict: AuthDefDict<ED>) {

    }

    getRelationalCheckers(): RelationChecker<ED, keyof ED, Cxt>[] {
        throw new Error('method not implemented');
    }

    addRelation(relation: ED['relation']['Schema']) {

    }
}