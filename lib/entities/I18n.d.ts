import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    module: String<64>;
    position: String<256>;
    languange: String<32>;
    data: Object;
}
