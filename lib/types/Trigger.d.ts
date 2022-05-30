import { GenericAction } from "../actions/action";
import { DeduceCreateOperation, DeduceRemoveOperation, DeduceSelection, DeduceUpdateOperation, EntityDict, OperateParams } from "../types/Entity";
import { EntityShape, TriggerDataAttribute, TriggerTimestampAttribute } from "../types/Entity";
import { Context } from "./Context";
export declare type CheckerType = 'user' | 'row' | 'data';
export interface CreateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    action: 'create';
    check?: (operation: DeduceCreateOperation<ED[T]['OpSchema']>) => boolean;
    fn: (event: {
        operation: DeduceCreateOperation<ED[T]['OpSchema']>;
    }, context: Cxt, params?: OperateParams) => Promise<number>;
}
export interface CreateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after';
}
export interface CreateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type CreateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = CreateTriggerInTxn<ED, T, Cxt> | CreateTriggerCrossTxn<ED, T, Cxt>;
export interface UpdateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    action: Exclude<ED[T]['Action'], GenericAction> | 'update' | Array<Exclude<ED[T]['Action'], GenericAction> | 'update'>;
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    check?: (operation: DeduceUpdateOperation<ED[T]['OpSchema']>) => boolean;
    fn: (event: {
        operation: DeduceUpdateOperation<ED[T]['OpSchema']>;
    }, context: Cxt, params?: OperateParams) => Promise<number>;
}
export interface UpdateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after';
}
export interface UpdateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type UpdateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = UpdateTriggerInTxn<ED, T, Cxt> | UpdateTriggerCrossTxn<ED, T, Cxt>;
export interface RemoveTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    action: 'remove';
    check?: (operation: DeduceRemoveOperation<ED[T]['OpSchema']>) => boolean;
    fn: (event: {
        operation: DeduceRemoveOperation<ED[T]['OpSchema']>;
    }, context: Cxt, params?: OperateParams) => Promise<number>;
}
export interface RemoveTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after';
}
export interface RemoveTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'commit';
    strict?: 'takeEasy' | 'makeSure';
}
export declare type RemoveTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = RemoveTriggerInTxn<ED, T, Cxt> | RemoveTriggerCrossTxn<ED, T, Cxt>;
export interface SelectTriggerBase<ED extends EntityDict, T extends keyof ED> {
    checkerType?: undefined;
    entity: T;
    name: string;
    action: 'select';
}
/**
 * selection似乎不需要支持跨事务？没想清楚
 * todo by Xc
 */
export interface SelectTriggerBefore<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends SelectTriggerBase<ED, T> {
    when: 'before';
    fn: (event: {
        operation: DeduceSelection<ED[T]['Schema']>;
    }, context: Cxt, params?: OperateParams) => Promise<number>;
}
export interface SelectTriggerAfter<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends SelectTriggerBase<ED, T> {
    when: 'after';
    fn: (event: {
        operation: ED[T]['Selection'];
        result: ED[T]['Schema'][];
    }, context: Cxt, params?: Object) => Promise<number>;
}
export declare type SelectTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = SelectTriggerBefore<ED, T, Cxt> | SelectTriggerAfter<ED, T, Cxt>;
export declare type Trigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = CreateTrigger<ED, T, Cxt> | UpdateTrigger<ED, T, Cxt> | RemoveTrigger<ED, T, Cxt> | SelectTrigger<ED, T, Cxt>;
export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
}
export declare abstract class Executor<ED extends EntityDict, Cxt extends Context<ED>> {
    static dataAttr: TriggerDataAttribute;
    static timestampAttr: TriggerTimestampAttribute;
    abstract registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    abstract preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Cxt, params?: OperateParams): Promise<void>;
    abstract postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Cxt, params?: OperateParams): Promise<void>;
    abstract checkpoint(context: Cxt, timestamp: number): Promise<number>;
}
