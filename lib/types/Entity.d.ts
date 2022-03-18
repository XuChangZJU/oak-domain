import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, MakeFilter, NodeId } from './Demand';
import { OneOf } from './Polyfill';
export declare type Filter<A extends string, F extends Object | undefined = undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};
declare type SelectOption = {
    forUpdate?: true;
    usingIndex?: 'todo';
};
export declare type OperateParams = {
    notCollect?: boolean;
};
export declare type FormUpdateData<SH extends EntityShape> = {
    [A in keyof SH]?: any;
} & {
    id?: undefined;
};
export declare type FormCreateData<SH extends EntityShape> = {
    [A in keyof SH]?: any;
} & {
    id: string;
};
export declare type Operation<A extends GenericAction | string, DATA extends Object, FILTER extends Object | undefined = undefined, SORTER extends Object | undefined = undefined> = {
    action: A;
    data: DATA;
    sorter?: SORTER;
    option?: A extends 'select' ? SelectOption : undefined;
} & Filter<A, FILTER>;
export declare type Selection<DATA extends Object, FILTER extends Object | undefined = undefined, SORT extends Object | undefined = undefined> = Operation<'select', DATA, FILTER, SORT>;
export interface EntityShape {
    id?: string;
    $$createAt$$?: number | Date;
    $$updateAt$$?: number | Date;
    $$removeAt$$?: number | Date;
    [K: string]: any;
}
export interface EntityDef {
    Schema: EntityShape;
    OpSchema: Partial<this['Schema']>;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<this['Schema']>, 'action'>;
    Operation: DeduceOperation<this['Schema']>;
}
export interface EntityDict {
    [E: string]: EntityDef;
}
declare type DeduceProjection<SH extends EntityShape> = Partial<{
    '#id': NodeId;
} & {
    [K in keyof SH]: 1 | any;
} & ExprOp<keyof SH>>;
declare type AttrFilter<SH extends EntityShape> = {
    [K in keyof SH]: any;
};
export declare type DeduceFilter<SH extends EntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;
export declare type DeduceSorterAttr<SH extends EntityShape> = OneOf<{
    [K: string]: 1 | object | undefined;
} & ExprOp<keyof SH>>;
export declare type DeduceSorter<SH extends EntityShape> = Array<{
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
}>;
export declare type DeduceSelection<SH extends EntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;
export declare type DeduceCreateOperationData<SH extends EntityShape> = FormCreateData<SH>;
export declare type DeduceCreateSingleOperation<SH extends EntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;
export declare type DeduceCreateMultipleOperation<SH extends EntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;
export declare type DeduceCreateOperation<SH extends EntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;
export declare type DeduceUpdateOperationData<SH extends EntityShape> = FormUpdateData<SH>;
export declare type DeduceUpdateOperation<SH extends EntityShape> = Operation<'update' | string, DeduceUpdateOperationData<SH>, DeduceFilter<SH>>;
export declare type DeduceRemoveOperationData<SH extends EntityShape> = {
    [A in keyof SH]?: any;
} & {
    [A: string]: any;
};
export declare type DeduceRemoveOperation<SH extends EntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>>;
export declare type DeduceOperation<SH extends EntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;
declare type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'];
};
declare type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u';
    e: T;
    d: ED[T]['OpSchema'];
    f?: DeduceFilter<ED[T]['Schema']>;
};
declare type RemoveOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'r';
    e: T;
    f?: DeduceFilter<ED[T]['Schema']>;
};
declare type SelectOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 's';
    e: T;
    d: Array<ED[T]['OpSchema']>;
};
export interface OperationResult<ED extends EntityDict> {
    operations: Array<CreateOpResult<ED, keyof ED> | UpdateOpResult<ED, keyof ED> | RemoveOpResult<ED, keyof ED> | SelectOpResult<ED, keyof ED>>;
    ids?: string[];
    stats?: 'todo';
    errors?: Array<{
        code?: number;
        message: string;
    }>;
}
export declare type SelectionResult<ED extends EntityDict, T extends keyof ED> = {
    result: Array<Partial<ED[T]['Schema'] & {
        [A in ExpressionKey]?: any;
    }>>;
    stats?: 'todo';
    errors?: Array<{
        code?: number;
        message: string;
    }>;
};
export {};
