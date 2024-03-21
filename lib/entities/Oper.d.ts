import { String, Datetime } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as User } from './User';
export interface Schema extends EntityShape {
    action: String<24>;
    data: Object;
    filter?: Object;
    extra?: Object;
    operator?: User;
    targetEntity: String<32>;
    bornAt?: Datetime;
}
