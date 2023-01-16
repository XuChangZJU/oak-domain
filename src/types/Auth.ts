import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
import { RefOrExpression } from "./Expression";

export type CheckerType = 'relation' | 'row' | 'data' | 'expression' | 'expressionRelation';

/**
 * conditionalFilter是指该action发生时，operation所操作的行中有满足conditionalFilter的行
 * 被转化成trigger的filter条件，详细可看trigger中的说明
 */
export type DataChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'data';
    entity: T;
    action: Omit<ED[T]['Action'], 'remove'> | Array<Omit<ED[T]['Action'], 'remove'>>;
    checker: (data: ED[T]['Create']['data'] | ED[T]['Update']['data'], context: Cxt) => void | Promise<void>;
    conditionalFilter?: ED[T]['Update']['filter'] | (
        (operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Selection']['filter']>
    );
};

export type RowChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'row';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    filter: ED[T]['Selection']['filter'] | (
        (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'] | Promise<ED[T]['Selection']['filter']>
    );       // 对行的额外检查条件
    errMsg?: string;
    inconsistentRows?: { // 因为这里的限制不一定在本row上，如果不传这个exception，则默认返回本row上的exception        
        entity: keyof ED;
        selection: (filter?: ED[T]['Selection']['filter']) => ED[keyof ED]['Selection'];
    };
    conditionalFilter?: ED[T]['Update']['filter'] | (
        (operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Update']['filter']>
    );
};

export type RelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'relation';
    entity: T;
    action: Omit<ED[T]['Action'], 'create'> | Array<Omit<ED[T]['Action'], 'create'>>;
    relationFilter: (operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'] | Promise<ED[T]['Selection']['filter']>;       // 生成一个额外的relation相关的filter，加在原先的filter上
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | (
        (operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter'] | Promise<ED[T]['Selection']['filter']>
    );
};

export type ExpressionTask<ED extends EntityDict, T extends keyof ED> = {
    entity: T;
    expr: RefOrExpression<keyof ED[T]['OpSchema']>;
    filter: ED[T]['Selection']['filter'];
};

export type ExpressionTaskCombination<ED extends EntityDict> = ExpressionTask<ED, keyof ED>[][];

export type ExpressionChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'expression';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    expression: <T2 extends keyof ED>(
        operation: ED[T]['Operation'] | ED[T]['Selection'],
        context: Cxt,
        option: OperateOption | SelectOption
    ) => ExpressionTaskCombination<ED> | undefined | string | Promise<ExpressionTaskCombination<ED> | string | undefined> ;       // 生成一个带表达式的查询任务数组，表达式结果为true代表可以过（or关系）。如果返回undefined直接过，返回string直接挂
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};

export type ExpressionRelationChecker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> = {
    priority?: number;
    type: 'expressionRelation';
    entity: T;
    action: ED[T]['Action'] | Array<ED[T]['Action']>;
    expression: <T2 extends keyof ED>(
        operation: ED[T]['Operation'] | ED[T]['Selection'],
        context: Cxt,
        option: OperateOption | SelectOption
    ) => ExpressionTaskCombination<ED> | undefined | string | Promise<ExpressionTaskCombination<ED> | string | undefined> ;       // 生成一个带表达式的查询任务数组，表达式结果为true代表可以过（or关系）。如果返回undefined直接过，返回string直接挂
    errMsg: string;
    conditionalFilter?: ED[T]['Update']['filter'] | ((operation: ED[T]['Operation'], context: Cxt, option: OperateOption) => ED[T]['Update']['filter']);
};


export type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> =
    DataChecker<ED, T, Cxt> | RowChecker<ED, T, Cxt> | RelationChecker<ED, T, Cxt> | ExpressionChecker<ED, T, Cxt> | ExpressionRelationChecker<ED, T, Cxt>;
