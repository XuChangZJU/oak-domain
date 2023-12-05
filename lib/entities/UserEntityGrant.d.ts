import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
type RelationIds = string[];
export interface Schema extends EntityShape {
    relationEntity: String<32>;
    relationEntityFilter: Object;
    relationIds: RelationIds;
}
export {};
