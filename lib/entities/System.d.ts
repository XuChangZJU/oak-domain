import { String, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    name: String<32>;
    description: Text;
    config: Object;
}
export declare type Relation = 'owner';
