import { ActionDef } from "../../types/Action";
import { GenericAction, RelationAction } from "../../actions/action";
export type UserAction = 'mergeTo' | string;
export type UserState = 'normal' | 'merged' | string;
export type ParticularAction = UserAction;
export declare const actions: string[];
export declare const UserActionDef: ActionDef<UserAction, UserState>;
export type Action = GenericAction | ParticularAction | RelationAction | string;
export declare const ActionDefDict: {
    userState: ActionDef<string, string>;
};
