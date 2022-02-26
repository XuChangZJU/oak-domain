import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';

export type Schema = {
    name: String<32>;
    description: Text;
    config: Object;
};

export type Relation = 'owner';