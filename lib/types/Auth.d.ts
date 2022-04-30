import { EntityDict } from "../types/Entity";
import { Context } from "./Context";
import { CreateTriggerBase, RemoveTriggerBase, UpdateTriggerBase, CheckerType } from "./Trigger";
export declare type CreateChecker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = {
    type: CheckerType;
    action: 'create';
    entity: T;
    checker: CreateTriggerBase<ED, T, Cxt>['fn'];
};
export declare type UpdateChecker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = {
    type: CheckerType;
    action: UpdateTriggerBase<ED, T, Cxt>['action'];
    entity: T;
    checker: UpdateTriggerBase<ED, T, Cxt>['fn'];
};
export declare type RemoveChecker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = {
    type: CheckerType;
    action: 'remove';
    entity: T;
    checker: RemoveTriggerBase<ED, T, Cxt>['fn'];
};
export declare type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = CreateChecker<ED, T, Cxt> | UpdateChecker<ED, T, Cxt> | RemoveChecker<ED, T, Cxt>;
