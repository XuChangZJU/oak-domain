import { String, Boolean, Text } from '../types/DataType';
import { Schema as Area } from './Area';
export declare type Schema = {
    detail: String<32>;
    area: Area;
    phone: String<12>;
    name: String<32>;
    default: Boolean;
    remark: Text;
};
