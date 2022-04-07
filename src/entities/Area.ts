import { String, Geo } from '../types/DataType';
import { EntityShape } from '../types/Entity';

export interface Schema extends EntityShape {
    name: String<32>;
    level: 'province' | 'city' | 'district' | 'street' | 'country';
    parent?: Schema;
    code: String<12>;
    center: Geo;
};
