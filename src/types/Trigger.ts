import { SelectOption, CheckerType } from ".";
import { GenericAction } from "../actions/action";
import { AsyncContext, AsyncRowStore } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption } from "../types/Entity";
import { EntityShape } from "../types/Entity";

// 当处于创建modi过程中的行为，create代表在创建createModi时就执行，apply代表在modi真正被应用（动作实际落地时）再执行，both代表两次都要执行
// 默认行为和trigger是否被标识为commit有关，见TriggerExecutor->judgeModiTurn函数逻辑
export type ModiTurn = 'create' | 'apply' | 'both';
/**
 * 优先级越小，越早执行。定义在1～99之间
 */
export const TRIGGER_MIN_PRIORITY = 1;
export const TRIGGER_DEFAULT_PRIORITY = 25;
export const TRIGGER_MAX_PRIORITY = 50;

export const CHECKER_MAX_PRIORITY = 99;

/**
 * logical可能会更改row和data的值，应当最先执行，data和row不能修改相关的值，如果要修改，手动置priority小一点以确保安全
 */
export const CHECKER_PRIORITY_MAP: Record<CheckerType, number> = {
    logical: 33,
    row: 51,
    data: 61,
    logicalData: 61,
    relation: 71,
    logicalRelation: 71,
};

interface TriggerBase<ED extends EntityDict, T extends keyof ED> {
    checkerType?: CheckerType;
    entity: T;
    name: string;
    priority?: number;
};

export interface CreateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends TriggerBase<ED, T> {
    action: 'create';
    mt?: ModiTurn;
    check?: (operation: ED[T]['Create']) => boolean;
};

export interface CreateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends CreateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after',
    fn: (event: { operation: ED[T]['Create']; }, context: Cxt, option: OperateOption) => Promise<number> | number;
};

interface TriggerCrossTxn<ED extends EntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>> {
    when: 'commit',
    strict?: 'takeEasy' | 'makeSure';
    cs?: true;        // cluster sensative，集群敏感的，需要由对应的集群进程统一处理
    fn: (event: { ids: string[] }, context: Cxt, option: OperateOption) => Promise<number> | number;
}

export interface CreateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> 
    extends CreateTriggerBase<ED, T, Cxt>, TriggerCrossTxn<ED, Cxt> {};

export type CreateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = CreateTriggerInTxn<ED, T, Cxt> | CreateTriggerCrossTxn<ED, T, Cxt>;

/**
 * update trigger如果带有filter，说明只对存在限定条件的行起作用。此时系统在进行相应动作时，
 * 会判定当前动作的filter条件和trigger所定义的filter是否有交集（即有同时满足两个条件的行）
 * 只要有，就会触发trigger。要注意的是这个条件是exists而不是all
 */
export interface UpdateTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends TriggerBase<ED, T> {
    action: Exclude<ED[T]['Action'], GenericAction> | 'update' | Array<Exclude<ED[T]['Action'], GenericAction> | 'update'>,
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    mt?: ModiTurn;
    check?: (operation: ED[T]['Update']) => boolean;
    filter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Update'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Update']['filter']>);
};

export interface UpdateTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends UpdateTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after',
    fn: (event: { operation: ED[T]['Update'] }, context: Cxt, option: OperateOption) => Promise<number> | number;
};

export interface UpdateTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> 
    extends UpdateTriggerBase<ED, T, Cxt>, TriggerCrossTxn<ED, Cxt> {};

export type UpdateTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = UpdateTriggerInTxn<ED, T, Cxt> | UpdateTriggerCrossTxn<ED, T, Cxt>;

/**
 * 同update trigger一样，remove trigger如果带有filter，说明只对存在限定条件的行起作用。此时系统在进行相应动作时，
 * 会判定当前动作的filter条件和trigger所定义的filter是否有交集（即有同时满足两个条件的行）
 * 只要有，就会触发trigger。要注意的是这个条件是exists而不是all
 */
export interface RemoveTriggerBase<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends TriggerBase<ED, T> {
    action: 'remove',
    mt?: ModiTurn;
    check?: (operation: ED[T]['Remove']) => boolean;
    filter?: ED[T]['Remove']['filter'] | ((operation: ED[T]['Remove'], context: Cxt, option: OperateOption) => ED[T]['Remove']['filter'] | Promise<ED[T]['Remove']['filter']>);
};

export interface RemoveTriggerInTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends RemoveTriggerBase<ED, T, Cxt> {
    when: 'before' | 'after',
    fn: (event: { operation: ED[T]['Remove'] }, context: Cxt, option: OperateOption) => Promise<number> | number;
};

export interface RemoveTriggerCrossTxn<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>
    extends RemoveTriggerBase<ED, T, Cxt>, TriggerCrossTxn<ED, Cxt> {};

export type RemoveTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = RemoveTriggerInTxn<ED, T, Cxt> | RemoveTriggerCrossTxn<ED, T, Cxt>;


export interface SelectTriggerBase<ED extends EntityDict, T extends keyof ED> extends TriggerBase<ED, T> {
    action: 'select';
};

/**
 * selection似乎不需要支持跨事务？没想清楚
 * todo by Xc
 */
export interface SelectTriggerBefore<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends SelectTriggerBase<ED, T> {
    when: 'before';
    fn: (event: { operation: ED[T]['Selection'] }, context: Cxt, params?: SelectOption) => Promise<number> | number;
};

export interface SelectTriggerAfter<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> extends SelectTriggerBase<ED, T> {
    when: 'after',
    fn: (event: {
        operation: ED[T]['Selection'];
        result: Partial<ED[T]['Schema']>[];
    }, context: Cxt, params?: SelectOption) => Promise<number> | number;
};

export type SelectTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = SelectTriggerBefore<ED, T, Cxt> | SelectTriggerAfter<ED, T, Cxt>;

export type Trigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = CreateTrigger<ED, T, Cxt> | UpdateTrigger<ED, T, Cxt>
    | RemoveTrigger<ED, T, Cxt> | SelectTrigger<ED, T, Cxt>;

export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
};

export type VolatileTrigger<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = CreateTriggerCrossTxn<ED, T, Cxt> | UpdateTriggerCrossTxn<ED, T, Cxt> | RemoveTriggerCrossTxn<ED, T, Cxt>;
