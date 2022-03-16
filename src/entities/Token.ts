import { String, Int, Datetime, Image, Boolean } from '../types/DataType';
import { Schema as User } from './User';
import { Schema as Application } from './Application';
import { AbleAction } from '../actions/action';

export type Schema = {
    application: Application;
    entity: String<32>;
    entityId: String<64>;
    user?: User;
    player?: User;
};

type Action = AbleAction;
