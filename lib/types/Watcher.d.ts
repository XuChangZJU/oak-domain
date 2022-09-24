import { SelectRowShape } from ".";
import { Context } from "./Context";
import { EntityDict, OperationResult } from "./Entity";
declare type ActionData<ED extends EntityDict, T extends keyof ED> = ED[T]['Update']['data'] | ED[T]['Remove']['data'];
export interface BBWatcher<ED extends EntityDict, T extends keyof ED> {
    name: string;
    entity: T;
    filter: ED[T]['Selection']['filter'] | (() => Promise<ED[T]['Selection']['filter']>);
    action: ED[T]['Operation']['action'];
    actionData: ActionData<ED, T> | (() => Promise<ActionData<ED, T>>);
}
export interface WBWatcher<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>, Proj extends ED[T]['Selection']['data'] = ED[T]['Selection']['data']> {
    name: string;
    entity: T;
    filter: ED[T]['Selection']['filter'] | (() => Promise<ED[T]['Selection']['filter']>);
    projection: Proj | (() => Promise<Proj>);
    fn: (context: Cxt, data: SelectRowShape<ED[T]['Schema'], Proj>[]) => Promise<OperationResult<ED>>;
}
export declare type Watcher<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = BBWatcher<ED, T> | WBWatcher<ED, T, Cxt>;
export {};
