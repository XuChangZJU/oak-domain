import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as UserEntityGrant } from './UserEntityGrant';
import { Schema as User } from './User';
import { Schema as Relation } from './Relation';
import { Schema as UserRelation } from './UserRelation';
export interface Schema extends EntityShape {
    ueg: UserEntityGrant;
    user: User;
    relation: Relation;
    claimEntityId: String<64>;
    userRelation: UserRelation;
}
