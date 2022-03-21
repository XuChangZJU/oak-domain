import { String, Int, Text, Image } from '../types/DataType';
import { Schema as User } from './User';
import { Schema as Token } from './Token';
import { EntityShape } from '../types/Entity';

export interface Schema extends EntityShape {
    mobile: String<16>;
    user: User;
    tokens: Array<Token>;
};
