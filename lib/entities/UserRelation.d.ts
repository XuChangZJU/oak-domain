import { EntityShape } from '../types/Entity';
import { Schema as User } from './User';
import { Schema as Relation } from './Relation';
export interface Schema extends EntityShape {
    user: User;
    relation: Relation;
}
