import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
import { RefOrExpression } from "./Expression";

export type CheckerType = 'relation' | 'row' | 'data' | 'expression' | 'expressionRelation';

export type DataChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'data';
    entity: T;
    action: Omit<ED[T]['Action'], 'remove'>;
    checker: (data: ED[T]['Create']['data'] | ED[T]['Update']['data'], context: Cxt) => void;
};

export type RowChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'row';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    filter: ED[T]['Selection']['filter'] | ((operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter']);       // 对行的额外检查条件
    errMsg?: string;
    inconsistentRows?: { // 因为这里的限制不一定在本row上，如果不传这个exception，则默认返回本row上的exception        
        entity: keyof ED;
        selection: (filter?: ED[T]['Selection']['filter']) => ED[keyof ED]['Selection'];
    };
};

export type RelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'relation';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    relationFilter: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'];       // 生成一个额外的relation相关的filter，加在原先的filter上
    errMsg: string;
};

export type ExpressionChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'expression';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    expression: <T2 extends keyof ED>(operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => {
        entity: T2;
        expr: RefOrExpression<keyof ED[T2]['OpSchema']>;
        filter: ED[T2]['Selection']['filter'];
    };       // 生成一个带表达式的查询任务，结果为true代表可以过，为false不可以
    errMsg: string;
};


export type ExpressionRelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'expressionRelation';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    expression: <T2 extends keyof ED>(operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => {
        entity: T2;
        expr: RefOrExpression<keyof ED[T2]['OpSchema']>;
        filter: ED[T2]['Selection']['filter'];
    };       // 生成一个带表达式的查询任务，结果为true代表可以过，为false不可以
    errMsg: string;
};


export type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> =
    DataChecker<ED, T, Cxt> | RowChecker<ED, T, Cxt> | RelationChecker<ED, T, Cxt> | ExpressionChecker<ED, T, Cxt> | ExpressionRelationChecker<ED, T, Cxt>;
