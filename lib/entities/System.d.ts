import { String, Text } from '../types/DataType';
export declare type Schema = {
    name: String<32>;
    description: Text;
    config: Object;
};
export declare type Relation = 'owner';
