import { String } from '../types/DataType';
import { Schema as User } from './User';
import { Schema as Token } from './Token';
export declare type Schema = {
    mobile: String<16>;
    user: User;
    tokens: Array<Token>;
};
