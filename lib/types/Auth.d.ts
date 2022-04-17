import { EntityDict } from "../types/Entity";
import { CreateTriggerBase, RemoveTriggerBase, UpdateTriggerBase } from "./Trigger";
export declare class AttrIllegalError extends Error {
    private attributes;
    constructor(attributes: string[], message?: string);
    getAttributes(): string[];
}
export declare type CreateChecker<ED extends EntityDict, T extends keyof ED> = {
    action: 'create';
    entity: T;
    checker: CreateTriggerBase<ED, T>['fn'];
};
export declare type UpdateChecker<ED extends EntityDict, T extends keyof ED> = {
    action: UpdateTriggerBase<ED, T>['action'];
    entity: T;
    checker: UpdateTriggerBase<ED, T>['fn'];
};
export declare type RemoveChecker<ED extends EntityDict, T extends keyof ED> = {
    action: 'remove';
    entity: T;
    checker: RemoveTriggerBase<ED, T>['fn'];
};
export declare type Checker<ED extends EntityDict, T extends keyof ED> = CreateChecker<ED, T> | UpdateChecker<ED, T> | RemoveChecker<ED, T>;
