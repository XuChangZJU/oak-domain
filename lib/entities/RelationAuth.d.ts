import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
type Relations = string[];
export interface Schema extends EntityShape {
    relation: Relation;
    path: String<256>;
    destEntity: String<32>;
    deRelations: Relations;
}
export {};
