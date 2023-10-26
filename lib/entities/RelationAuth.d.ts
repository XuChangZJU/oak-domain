import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
import { Schema as Path } from './Path';
export interface Schema extends EntityShape {
    sourceRelation: Relation;
    path: Path;
    destRelation: Relation;
}
