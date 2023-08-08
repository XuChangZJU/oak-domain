import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
declare type Actions = string[];
declare type Paths = string[];
export interface Schema extends EntityShape {
    relation?: Relation;
    path: String<256>;
    paths: Paths;
    destEntity: String<32>;
    deActions: Actions;
}
export {};
