import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
type Actions = string[];
type Paths = string[];
export interface Schema extends EntityShape {
    relation?: Relation;
    paths: Paths;
    destEntity: String<32>;
    deActions: Actions;
}
export {};
