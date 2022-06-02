import { Context } from "./Context";
import { DeduceFilter, DeduceRemoveOperationData, DeduceUpdateOperationData, EntityDict, OperationResult, SelectionResult } from "./Entity";

type ActionData<ED extends EntityDict, T extends keyof ED> = ED[T]['Update']['data'] | ED[T]['Remove']['data'];

export interface BBWatcher<ED extends EntityDict, T extends keyof ED> {
    name: string;
    entity: T;
    filter: ED[T]['Selection']['filter'] | (() => Promise<ED[T]['Selection']['filter']>);
    action: ED[T]['Operation']['action'];
    actionData: ActionData<ED, T> | (() => Promise<ActionData<ED, T>>);
};

export interface WBWatcher<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    name: string;
    entity: T;
    filter: ED[T]['Selection']['filter'] | (() => Promise<ED[T]['Selection']['filter']>);
    projection: ED[T]['Selection']['data'] | (() => Promise<ED[T]['Selection']['data']>);
    fn: (context: Cxt, data: SelectionResult<ED[T]['Schema'], Required<this['projection']>>['result']) => Promise<OperationResult<ED>>;
};

export type Watcher<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = BBWatcher<ED, T> | WBWatcher<ED, T, Cxt>;
