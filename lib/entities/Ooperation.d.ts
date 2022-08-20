import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    action: String<16>;
    data: Object;
    entity?: String<32>;
    entityId?: String<64>;
    filter?: Object;
    extra?: Object;
    operatorId: String<32>;
    operatorInfo?: Object;
}
