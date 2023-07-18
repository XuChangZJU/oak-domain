import { ActionDef } from "../../types/Action";
import { GenericAction } from "../../actions/action";
export type IState = 'active' | 'applied' | 'abandoned' | string;
export type IAction = 'apply' | 'abandon' | string;
export type ParticularAction = IAction;
export type Action = GenericAction | ParticularAction | string;
export declare const actions: string[];
export declare const ActionDefDict: {
    iState: ActionDef<string, string>;
};
