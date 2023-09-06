import { ActionDef } from "../../types/Action";
import { GenericAction } from "../../actions/action";
export declare type IState = 'active' | 'applied' | 'abandoned' | string;
export declare type IAction = 'apply' | 'abandon' | string;
export declare type ParticularAction = IAction;
export declare const actions: string[];
export declare type Action = GenericAction | ParticularAction | string;
export declare const ActionDefDict: {
    iState: ActionDef<string, string>;
};
