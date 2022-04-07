import { EntityShape } from '../types/Entity';
import { String } from '../types/DataType';
export interface Schema extends EntityShape {
    name: String<64>;
}
export declare type Relation = 'owner';
