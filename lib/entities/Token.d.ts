import { String } from '../types/DataType';
import { Schema as User } from './User';
import { Schema as Application } from './Application';
export declare type Schema = {
    application: Application;
    entity: String<32>;
    entityId: String<64>;
    user?: User;
    player?: User;
};
