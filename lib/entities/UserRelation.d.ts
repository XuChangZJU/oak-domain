import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as User } from './User';
import { Schema as Relation } from './Relation';
export interface Schema extends EntityShape {
    user: User;
    relation: Relation;
    entity: String<32>;
    entityId: String<64>;
}
