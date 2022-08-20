import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    action: String<16>;
    data: Object;
    filter?: Object;
    extra?: Object;
}
