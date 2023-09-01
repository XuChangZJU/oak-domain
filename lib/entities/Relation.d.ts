import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    entity: String<32>;
    entityId?: String<64>;
    name?: String<32>;
    display?: String<32>;
}
