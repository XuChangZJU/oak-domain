import { ActionDef } from "../../types/Action";
import { GenericAction } from "../../actions/action";
export type IState = 'active' | 'applied' | 'abandoned';
export type IAction = 'apply' | 'abandon';
export type ParticularAction = IAction;
export type Action = GenericAction | ParticularAction;
export declare const actions: string[];
export declare const ActionDefDict: {
    iState: ActionDef<IAction, IState>;
};
