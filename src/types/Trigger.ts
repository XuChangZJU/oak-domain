import { SelectRowShape } from ".";
import { GenericAction } from "../actions/action";
import { DeduceCreateOperation, DeduceRemoveOperation, DeduceSelection, DeduceUpdateOperation, EntityDict, OperateParams } from "../types/Entity";
import { EntityDef, EntityShape, OperationResult, SelectionResult, TriggerDataAttribute, TriggerTimestampAttribute } from "../types/Entity";
import { Context } from "./Context";

export type CheckerType = 'user' | 'row' | 'data';

export interface CreateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    action: 'create',
    check?: (operation: DeduceCreateOperation<ED[T]['OpSchema']>) => boolean;
    fn: (event: { operation: DeduceCreateOperation<ED[T]['OpSchema']>; }, context: Cxt, params?: OperateParams) => Promise<number>;
};

export interface CreateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after',
};

export interface CreateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'commit',
    strict?: 'takeEasy' | 'makeSure';
};

export type CreateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = CreateTriggerInTxn<ED, T, Cxt> | CreateTriggerCrossTxn<ED, T, Cxt>;


export interface UpdateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    action: Exclude<ED[T]['Action'], GenericAction> | 'update' | Array<Exclude<ED[T]['Action'], GenericAction> | 'update'>,
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    check?: (operation: DeduceUpdateOperation<ED[T]['OpSchema']>) => boolean;
    fn: (event: { operation: DeduceUpdateOperation<ED[T]['OpSchema']> }, context: Cxt, params?: OperateParams) => Promise<number>;
};

export interface UpdateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after',
};

export interface UpdateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'commit',
    strict?: 'takeEasy' | 'makeSure';
};

export type UpdateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = UpdateTriggerInTxn<ED, T, Cxt> | UpdateTriggerCrossTxn<ED, T, Cxt>;


export interface RemoveTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    action: 'remove',
    check?: (operation: DeduceRemoveOperation<ED[T]['OpSchema']>) => boolean;
    fn: (event: { operation: DeduceRemoveOperation<ED[T]['OpSchema']> }, context: Cxt, params?: OperateParams) => Promise<number>;
};

export interface RemoveTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after',
};

export interface RemoveTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'commit',
    strict?: 'takeEasy' | 'makeSure';
};

export type RemoveTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = RemoveTriggerInTxn<ED, T, Cxt> | RemoveTriggerCrossTxn<ED, T, Cxt>;


export interface SelectTriggerBase<ED extends EntityDict, T extends keyof ED> {
    checkerType?: undefined;
    entity: T;
    name: string;
    action: 'select';
};

/**
 * selection似乎不需要支持跨事务？没想清楚
 * todo by Xc
 */
export interface SelectTriggerBefore<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends SelectTriggerBase<ED, T> {
    when: 'before';
    fn: (event: { operation: ED[T]['Selection'] }, context: Cxt, params?: OperateParams) => Promise<number>;
};

export interface SelectTriggerAfter<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> extends SelectTriggerBase<ED, T> {
    when: 'after',
    fn: (event: {
        operation: ED[T]['Selection'];
        result: SelectRowShape<ED[T]['Schema'], ED[T]['Selection']['data']>[];
    }, context: Cxt, params?: Object) => Promise<number>;
};

export type SelectTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = SelectTriggerBefore<ED, T, Cxt> | SelectTriggerAfter<ED, T, Cxt>;

export type Trigger<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>> = CreateTrigger<ED, T, Cxt> | UpdateTrigger<ED, T, Cxt>
    | RemoveTrigger<ED, T, Cxt> | SelectTrigger<ED, T, Cxt>;

export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
};

export abstract class Executor<ED extends EntityDict, Cxt extends Context<ED>> {
    static dataAttr: TriggerDataAttribute = '$$triggerData$$';
    static timestampAttr: TriggerTimestampAttribute = '$$triggerTimestamp$$';

    abstract registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;

    abstract preOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        params?: OperateParams
    ): Promise<void>;

    abstract postOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        params?: OperateParams
    ): Promise<void>;

    abstract checkpoint(context: Cxt, timestamp: number): Promise<number>;    // 将所有在timestamp之前存在不一致的数据进行恢复
}
