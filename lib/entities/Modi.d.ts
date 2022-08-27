import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    targetEntity: String<32>;
    entity: String<32>;
    entityId: String<64>;
    action: String<16>;
    data: Object;
    filter?: Object;
    extra?: Object;
}
