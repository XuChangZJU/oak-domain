import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';

export type Schema = {
    name: String<32>;
    level: 'province' | 'city' | 'district' | 'street';
    parent: Schema;
    code: String<12>;
};
