import { ActionDef } from "../../types/Action";
import { GenericAction, RelationAction } from "../../actions/action";
export declare type UserAction = 'mergeTo' | string;
export declare type UserState = 'normal' | 'merged' | string;
export declare type ParticularAction = UserAction;
export declare const actions: string[];
export declare type Action = GenericAction | ParticularAction | RelationAction | string;
export declare const ActionDefDict: {
    userState: ActionDef<string, string>;
};
