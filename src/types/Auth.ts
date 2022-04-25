import { EntityDict } from "../types/Entity";
import { Context } from "./Context";
import { CreateTriggerBase, RemoveTriggerBase, UpdateTriggerBase } from "./Trigger";

export type CreateChecker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = {
    action: 'create';
    entity: T;
    checker: CreateTriggerBase<ED, T, Cxt>['fn'],
};

export type UpdateChecker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = {
    action: UpdateTriggerBase<ED, T, Cxt>['action'];
    entity: T;
    checker: UpdateTriggerBase<ED, T, Cxt>['fn'],
};

export type RemoveChecker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = {
    action: 'remove';
    entity: T;
    checker: RemoveTriggerBase<ED, T, Cxt>['fn'],
};

export type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = CreateChecker<ED, T, Cxt> | UpdateChecker<ED, T, Cxt> | RemoveChecker<ED, T, Cxt>;
