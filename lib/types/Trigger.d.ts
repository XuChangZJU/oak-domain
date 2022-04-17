import { GenericAction } from "../actions/action";
import { DeduceCreateOperation, DeduceRemoveOperation, DeduceSelection, DeduceUpdateOperation, EntityDict } from "../types/Entity";
import { EntityShape, SelectionResult2, TriggerDataAttribute, TriggerTimestampAttribute } from "../types/Entity";
import { Context } from "./Context";
export interface CreateTriggerBase<ED extends EntityDict, T extends keyof ED> {
    entity: T;
    name: string;
    action: 'create';
    check?: (operation: DeduceCreateOperation<ED[T]['Schema']>) => boolean;
    fn: (event: {
        operation: DeduceCreateOperation<ED[T]['Schema']>;
    }, context: Context<ED>, params?: Object) => Promise<number>;
}
export interface CreateTriggerInTxn<ED extends EntityDict, T extends keyof ED> extends CreateTriggerBase<ED, T> {
    when: 'before' | 'after';
}
export interface CreateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED> extends CreateTriggerBase<ED, T> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type CreateTrigger<ED extends EntityDict, T extends keyof ED> = CreateTriggerInTxn<ED, T> | CreateTriggerCrossTxn<ED, T>;
export interface UpdateTriggerBase<ED extends EntityDict, T extends keyof ED> {
    entity: T;
    name: string;
    action: Exclude<ED[T]['Action'], GenericAction> | 'update';
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    check?: (operation: DeduceUpdateOperation<ED[T]['Schema']>) => boolean;
    fn: (event: {
        operation: DeduceUpdateOperation<ED[T]['Schema']>;
    }, context: Context<ED>, params?: Object) => Promise<number>;
}
export interface UpdateTriggerInTxn<ED extends EntityDict, T extends keyof ED> extends UpdateTriggerBase<ED, T> {
    when: 'before' | 'after';
}
export interface UpdateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED> extends UpdateTriggerBase<ED, T> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type UpdateTrigger<ED extends EntityDict, T extends keyof ED> = UpdateTriggerInTxn<ED, T> | UpdateTriggerCrossTxn<ED, T>;
export interface RemoveTriggerBase<ED extends EntityDict, T extends keyof ED> {
    entity: T;
    name: string;
    action: 'remove';
    check?: (operation: DeduceRemoveOperation<ED[T]['Schema']>) => boolean;
    fn: (event: {
        operation: DeduceRemoveOperation<ED[T]['Schema']>;
    }, context: Context<ED>, params?: Object) => Promise<number>;
}
export interface RemoveTriggerInTxn<ED extends EntityDict, T extends keyof ED> extends RemoveTriggerBase<ED, T> {
    when: 'before' | 'after';
}
export interface RemoveTriggerCrossTxn<ED extends EntityDict, T extends keyof ED> extends RemoveTriggerBase<ED, T> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type RemoveTrigger<ED extends EntityDict, T extends keyof ED> = RemoveTriggerInTxn<ED, T> | RemoveTriggerCrossTxn<ED, T>;
export interface SelectTriggerBase<ED extends EntityDict, T extends keyof ED> {
    entity: T;
    name: string;
    action: 'select';
}
/**
 * selection似乎不需要支持跨事务？没想清楚
 * todo by Xc
 */
export interface SelectTriggerBefore<ED extends EntityDict, T extends keyof ED> extends SelectTriggerBase<ED, T> {
    when: 'before';
    fn: (event: {
        operation: DeduceSelection<ED[T]['Schema']>;
    }, context: Context<ED>, params?: Object) => Promise<number>;
}
export interface SelectTriggerAfter<ED extends EntityDict, T extends keyof ED> extends SelectTriggerBase<ED, T> {
    when: 'after';
    fn: <S extends ED[T]['Selection']>(event: {
        operation: S;
        result: SelectionResult2<ED[T]['Schema'], S['data']>;
    }, context: Context<ED>, params?: Object) => Promise<number>;
}
export declare type SelectTrigger<ED extends EntityDict, T extends keyof ED> = SelectTriggerBefore<ED, T> | SelectTriggerAfter<ED, T>;
export declare type Trigger<ED extends EntityDict, T extends keyof ED> = CreateTrigger<ED, T> | UpdateTrigger<ED, T> | RemoveTrigger<ED, T> | SelectTrigger<ED, T>;
export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
}
export declare abstract class Executor<ED extends EntityDict> {
    static dataAttr: TriggerDataAttribute;
    static timestampAttr: TriggerTimestampAttribute;
    abstract registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void;
    abstract preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    abstract postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    abstract checkpoint(context: Context<ED>, timestamp: number): Promise<number>;
}
