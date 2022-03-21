import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';

export interface Schema extends EntityShape {
    name: String<32>;
    description: Text;
    config: Object;
};

export type Relation = 'owner';