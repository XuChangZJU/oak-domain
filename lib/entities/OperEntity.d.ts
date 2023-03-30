import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Oper } from './Oper';
export interface Schema extends EntityShape {
    oper: Oper;
    entity: String<32>;
    entityId: String<64>;
}
