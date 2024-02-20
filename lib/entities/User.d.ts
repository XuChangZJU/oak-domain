import { String, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { ActionDef } from '../types/Action';
import { EntityDesc } from '../types/EntityDesc';
export interface Schema extends EntityShape {
    name?: String<16>;
    nickname?: String<64>;
    password?: Text;
    ref?: Schema;
}
type UserAction = 'mergeTo';
type UserState = 'normal' | 'merged';
export type Action = UserAction;
export declare const UserActionDef: ActionDef<UserAction, UserState>;
export declare const entityDesc: EntityDesc<Schema, Action, '', {
    userState: UserState;
}>;
export {};
