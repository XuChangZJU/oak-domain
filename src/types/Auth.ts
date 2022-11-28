import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OperateOption, SelectOption } from "../types/Entity";

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
    filter: ED[T]['Selection']['filter'] | ((context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter']);       // 对行的额外检查条件
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
    relationFilter: (context: Cxt, option: OperateOption | SelectOption) => ED[T]['Selection']['filter'];       // 生成一个额外的relation相关的filter，加在原先的filter上
    errMsg: string;
};


export type Checker<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>> =
    DataChecker<ED, T, Cxt> | RowChecker<ED, T, Cxt> | RelationChecker<ED, T, Cxt>;
