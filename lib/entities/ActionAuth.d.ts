import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
import { Schema as Path } from './Path';
type Actions = string[];
export interface Schema extends EntityShape {
    relation?: Relation;
    path: Path;
    deActions: Actions;
}
export {};
