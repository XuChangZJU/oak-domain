import { EntityDict } from "../types/Entity";
import { CreateTriggerBase, RemoveTriggerBase, UpdateTriggerBase } from "./Trigger";

export class AttrIllegalError extends Error {
    private attributes: string[];
    constructor(attributes: string[], message?: string) {
        super(message);
        this.attributes = attributes;
    }

    getAttributes() {
        return this.attributes;
    }
};


export type CreateChecker<ED extends EntityDict, T extends keyof ED> = {
    action: 'create';
    entity: T;
    checker: CreateTriggerBase<ED, T>['fn'],
};

export type UpdateChecker<ED extends EntityDict, T extends keyof ED> = {
    action: UpdateTriggerBase<ED, T>['action'];
    entity: T;
    checker: UpdateTriggerBase<ED, T>['fn'],
};

export type RemoveChecker<ED extends EntityDict, T extends keyof ED> = {
    action: 'remove';
    entity: T;
    checker: RemoveTriggerBase<ED, T>['fn'],
};

export type Checker<ED extends EntityDict, T extends keyof ED> = CreateChecker<ED, T> | UpdateChecker<ED, T> | RemoveChecker<ED, T>;
