import { CascadeActionAuth, CascadeRelationAuth, ActionOnRemove, SyncOrAsync } from ".";
import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
import { ModiTurn } from './Trigger';
export type CheckerType = 'relation' | 'row' | 'data' | 'logical' | 'logicalRelation' | 'logicalData';
/**
 * conditionalFilter是指该action发生时，operation所操作的行中有满足conditionalFilter的行
 * 被转化成trigger的filter条件，详细可看trigger中的说明
 */
export type DataChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'data';
    entity: T;
    mt?: ModiTurn;
    action: Omit<ED[T]['Action'], 'remove'> | Array<Omit<ED[T]['Action'], 'remove'>>;
    checker: (data: ED[T]['Create']['data'] | ED[T]['Update']['data'], context: Cxt) => SyncOrAsync<any>;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => SyncOrAsync<ED[T]['Selection']['filter']>);
};
export type RowChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'row';
    entity: T;
    mt?: ModiTurn;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    filter: ED[T]['Selection']['filter'] | ((operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => SyncOrAsync<ED[T]['Selection']['filter']>);
    errMsg?: string;
    inconsistentRows?: {
        entity: keyof ED;
        selection: (filter?: ED[T]['Selection']['filter']) => ED[keyof ED]['Selection'];
    };
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => SyncOrAsync<ED[T]['Update']['filter']>);
};
export type RelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'relation';
    entity: T;
    mt?: ModiTurn;
    when?: 'after';
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    relationFilter: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => SyncOrAsync<ED[T]['Selection']['filter']>;
    errMsg: string | ((operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option?: OperateOption | SelectOption) => string);
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => SyncOrAsync<ED[T]['Selection']['filter']>);
};
export type LogicalChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'logical' | 'logicalData' | 'logicalRelation';
    when?: 'after';
    mt?: ModiTurn;
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    checker: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => SyncOrAsync<any>;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => SyncOrAsync<ED[T]['Update']['filter']>);
};
export type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = DataChecker<ED, T, Cxt> | RowChecker<ED, T, Cxt> | RelationChecker<ED, T, Cxt> | LogicalChecker<ED, T, Cxt>;
export type AuthDef<ED extends EntityDict, T extends keyof ED> = {
    relationAuth?: CascadeRelationAuth<NonNullable<ED[T]['Relation']>>;
    actionAuth?: CascadeActionAuth<ED[T]['Action']>;
    cascadeRemove?: {
        [E in (keyof ED | keyof ED[T]['Schema'] | '@entity')]?: ActionOnRemove;
    };
};
export type CascadeRemoveDefDict<ED extends EntityDict> = {
    [T in keyof ED]?: {
        [E in (keyof ED | keyof ED[T]['Schema'] | '@entity')]?: ActionOnRemove;
    };
};
export type AuthDefDict<ED extends EntityDict> = {
    [K in keyof ED]?: AuthDef<ED, K>;
};
