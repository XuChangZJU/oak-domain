import { ActionDef } from "../../types/Action";
import { GenericAction } from "../../actions/action";
export declare type IState = 'active' | 'applied' | 'abandoned';
export declare type IAction = 'apply' | 'abandon';
export declare type ParticularAction = IAction;
export declare type Action = GenericAction | ParticularAction;
export declare const actions: string[];
export declare const ActionDefDict: {
    iState: ActionDef<IAction, IState>;
};
