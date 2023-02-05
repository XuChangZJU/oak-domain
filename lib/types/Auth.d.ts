import { CascadeActionAuth, CascadeRelationAuth, ActionOnRemove } from ".";
import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
export declare type CheckerType = 'relation' | 'row' | 'data' | 'logical' | 'logicalRelation';
/**
 * conditionalFilter是指该action发生时，operation所操作的行中有满足conditionalFilter的行
 * 被转化成trigger的filter条件，详细可看trigger中的说明
 */
export declare type DataChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'data';
    entity: T;
    action: Omit<ED[T]['Action'], 'remove'> | Array<Omit<ED[T]['Action'], 'remove'>>;
    checker: (data: ED[T]['Create']['data'] | ED[T]['Update']['data'], context: Cxt) => any | Promise<any>;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Selection']['filter']>);
};
export declare type RowChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'row';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    filter: ED[T]['Selection']['filter'] | ((operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'] | Promise<ED[T]['Selection']['filter']>);
    errMsg?: string;
    inconsistentRows?: {
        entity: keyof ED;
        selection: (filter?: ED[T]['Selection']['filter']) => ED[keyof ED]['Selection'];
    };
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Update']['filter']>);
};
export declare type RelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'relation';
    entity: T;
    when?: 'after';
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    relationFilter: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'] | Promise<ED[T]['Selection']['filter']>;
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Selection']['filter']>);
};
export declare type LogicalChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'logical';
    when?: 'after';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    checker: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => any | Promise<any>;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type LogicalRelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'logicalRelation';
    when?: 'after';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    checker: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => any | Promise<any>;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = DataChecker<ED, T, Cxt> | RowChecker<ED, T, Cxt> | RelationChecker<ED, T, Cxt> | LogicalChecker<ED, T, Cxt> | LogicalRelationChecker<ED, T, Cxt>;
export declare type AuthDef<ED extends EntityDict, T extends keyof ED> = {
    relationAuth?: CascadeRelationAuth<NonNullable<ED[T]['Relation']>>;
    actionAuth?: CascadeActionAuth<ED[T]['Action']>;
    cascadeRemove?: {
        [E in (keyof ED | '@entity')]?: ActionOnRemove;
    };
};
export declare type AuthDefDict<ED extends EntityDict> = {
    [K in keyof ED]?: AuthDef<ED, K>;
};
