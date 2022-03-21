import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';

export interface Schema extends EntityShape {
    name: String<32>;
    level: 'province' | 'city' | 'district' | 'street';
    parent: Schema;
    code: String<12>;
};
