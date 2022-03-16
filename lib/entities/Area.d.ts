import { String } from '../types/DataType';
export declare type Schema = {
    name: String<32>;
    level: 'province' | 'city' | 'district' | 'street';
    parent: Schema;
    code: String<12>;
};
