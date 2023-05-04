import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
export interface Schema extends EntityShape {
    path: String<256>;
    destRelation: Relation;
}
