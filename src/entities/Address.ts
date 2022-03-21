import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Area } from './Area';

export interface Schema extends EntityShape {
    detail: String<32>;
    area: Area;
    phone: String<12>;
    name: String<32>;
    default: Boolean;
    remark: Text;
};
