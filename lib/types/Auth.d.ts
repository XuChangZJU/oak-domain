import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
import { RefOrExpression } from "./Expression";
export declare type CheckerType = 'relation' | 'row' | 'data' | 'expression' | 'expressionRelation';
/**
 * conditionalFilter是指该action发生时，operation所操作的行中有满足conditionalFilter的行
 * 被转化成trigger的filter条件，详细可看trigger中的说明
 */
export declare type DataChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'data';
    entity: T;
    action: Omit<ED[T]['Action'], 'remove'> | Array<Omit<ED[T]['Action'], 'remove'>>;
    checker: (data: ED[T]['Create']['data'] | ED[T]['Update']['data'], context: Cxt) => void;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type RowChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'row';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    filter: ED[T]['Selection']['filter'] | ((operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter']);
    errMsg?: string;
    inconsistentRows?: {
        entity: keyof ED;
        selection: (filter?: ED[T]['Selection']['filter']) => ED[keyof ED]['Selection'];
    };
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type RelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'relation';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    relationFilter: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'];
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type ExpressionChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'expression';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    expression: <T2 extends keyof ED>(operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => {
        entity: T2;
        expr: RefOrExpression<keyof ED[T2]['OpSchema']>;
        filter: ED[T2]['Selection']['filter'];
    };
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type ExpressionRelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'expressionRelation';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    expression: <T2 extends keyof ED>(operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => {
        entity: T2;
        expr: RefOrExpression<keyof ED[T2]['OpSchema']>;
        filter: ED[T2]['Selection']['filter'];
    };
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};
export declare type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = DataChecker<ED, T, Cxt> | RowChecker<ED, T, Cxt> | RelationChecker<ED, T, Cxt> | ExpressionChecker<ED, T, Cxt> | ExpressionRelationChecker<ED, T, Cxt>;
