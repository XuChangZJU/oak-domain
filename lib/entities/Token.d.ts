import { String } from '../types/DataType';
import { Schema as User } from './User';
export declare type Schema = {
    entity: String<32>;
    entityId: String<64>;
    user?: User;
    player?: User;
};
