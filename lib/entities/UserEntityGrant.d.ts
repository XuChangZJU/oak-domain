import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
export interface Schema extends EntityShape {
    entity: String<32>;
    entityId: String<64>;
    relation: Relation;
}
