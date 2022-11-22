import { SelectOption } from ".";
import { GenericAction } from "../actions/action";
import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption } from "../types/Entity";
import { EntityShape } from "../types/Entity";
export declare type CheckerType = 'relation' | 'row' | 'data';
interface TriggerBase<ED extends EntityDict, T extends keyof ED> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    priority?: number;
}
export interface CreateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends TriggerBase<ED, T> {
    action: 'create';
    check?: (operation: ED[T]['Create']) => boolean;
    fn: (event: {
        operation: ED[T]['Create'];
    }, context: Cxt, option: OperateOption) => Promise<number> | number;
}
export interface CreateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after';
}
export interface CreateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type CreateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = CreateTriggerInTxn<ED, T, Cxt> | CreateTriggerCrossTxn<ED, T, Cxt>;
export interface UpdateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends TriggerBase<ED, T> {
    action: Exclude<ED[T]['Action'], GenericAction> | 'update' | Array<Exclude<ED[T]['Action'], GenericAction> | 'update'>;
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    check?: (operation: ED[T]['Update']) => boolean;
    fn: (event: {
        operation: ED[T]['Update'];
    }, context: Cxt, option: OperateOption) => Promise<number> | number;
}
export interface UpdateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after';
}
export interface UpdateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type UpdateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = UpdateTriggerInTxn<ED, T, Cxt> | UpdateTriggerCrossTxn<ED, T, Cxt>;
export interface RemoveTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends TriggerBase<ED, T> {
    action: 'remove';
    check?: (operation: ED[T]['Remove']) => boolean;
    fn: (event: {
        operation: ED[T]['Remove'];
    }, context: Cxt, option: OperateOption) => Promise<number> | number;
}
export interface RemoveTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after';
}
export interface RemoveTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type RemoveTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = RemoveTriggerInTxn<ED, T, Cxt> | RemoveTriggerCrossTxn<ED, T, Cxt>;
export interface SelectTriggerBase<ED extends EntityDict, T extends keyof ED> extends TriggerBase<ED, T> {
    action: 'select';
}
/**
 * selection似乎不需要支持跨事务？没想清楚
 * todo by Xc
 */
export interface SelectTriggerBefore<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends SelectTriggerBase<ED, T> {
    when: 'before';
    fn: (event: {
        operation: ED[T]['Selection'];
    }, context: Cxt, params?: SelectOption) => Promise<number> | number;
}
export interface SelectTriggerAfter<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends SelectTriggerBase<ED, T> {
    when: 'after';
    fn: (event: {
        operation: ED[T]['Selection'];
        result: Partial<ED[T]['Schema']>[];
    }, context: Cxt, params?: SelectOption) => Promise<number> | number;
}
export declare type SelectTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = SelectTriggerBefore<ED, T, Cxt> | SelectTriggerAfter<ED, T, Cxt>;
export declare type Trigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = CreateTrigger<ED, T, Cxt> | UpdateTrigger<ED, T, Cxt> | RemoveTrigger<ED, T, Cxt> | SelectTrigger<ED, T, Cxt>;
export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
}
export {};
