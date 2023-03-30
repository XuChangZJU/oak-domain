import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Oper } from './Oper';
export interface Schema extends EntityShape {
    oper: Oper;
    targetEntityId: String<64>;
}
