import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperationResult } from "./Entity";

type ActionData<ED extends EntityDict, T extends keyof ED> = ED[T]['Update']['data'] | ED[T]['Remove']['data'];

export interface BBWatcher<ED extends EntityDict, T extends keyof ED> {
    name: string;
    entity: T;
    filter: ED[T]['Selection']['filter'] | (() => ED[T]['Selection']['filter']);
    action: ED[T]['Operation']['action'];
    actionData: ActionData<ED, T> | (() => ActionData<ED, T>);
};

export interface WBWatcher<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> {
    name: string;
    entity: T;
    filter: ED[T]['Selection']['filter'] | (() => Promise<ED[T]['Selection']['filter']>);
    projection: ED[T]['Selection']['data'] | (() => Promise<ED[T]['Selection']['data']>);
    fn: (context: Cxt, data: Partial<ED[T]['Schema']>[]) => Promise<OperationResult<ED>>;
};

export type Watcher<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> = BBWatcher<ED, T> | WBWatcher<ED, T, Cxt>;
