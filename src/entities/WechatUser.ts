import { String, Int, Datetime, Image, Boolean } from '../types/DataType';
import { Schema as User } from './User';
import { Schema as Application } from './Application';

export type Schema = {
    origin: 'mp' | 'public';
    openId?: String<32>;
    unionId?: String<32>;
    accessToken: String<32>;
    sessionKey?: String<64>;
    subscribed?: Boolean;
    subscribedAt?: Datetime;
    unsubscribedAt?: Datetime;
    user?: User;
    application: Application;
};
