import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Modi } from './Modi';
export interface Schema extends EntityShape {
    modi: Modi;
    entity: String<32>;
    entityId: String<64>;
}
