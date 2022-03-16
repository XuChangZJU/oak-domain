import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, FulltextFilter, MakeFilter, NodeId, Q_BooleanValue, Q_NumberValue, Q_StringValue } from './Demand';
import { OneOf } from './Polyfill';

export type Filter<A extends string, F extends Object | undefined = undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};

type SelectOption = {
    forUpdate?: true;
    usingIndex?: 'todo';
};

export type FormUpdateData<SH extends EntityShape> = {
    [A in keyof SH]?: any;
} & { id?: undefined };

export type FormCreateData<SH extends EntityShape> = {
    [A in keyof SH]?: any;
} & { id: string };

export type Operation<A extends GenericAction | string,
    DATA extends Object,
    FILTER extends Object | undefined = undefined,
    SORTER extends Object | undefined = undefined> = {
        action: A;
        data: DATA;
        sorter?: SORTER;
        option?: A extends 'select' ? SelectOption : undefined;
    } & Filter<A, FILTER>;

export type Selection<DATA extends Object,
    FILTER extends Object | undefined = undefined,
    SORT extends Object | undefined = undefined> = Operation<'select', DATA, FILTER, SORT>;

export interface EntityShape {
    id?: string;
    $$createAt$$?: number | Date;
    $$updateAt$$?: number | Date;
    $$removeAt$$?: number | Date;
    [K: string]: any;
}

export interface EntityDef {
    // Name: E;
    Schema: EntityShape;
    OpSchema: Partial<this['Schema']>;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<this['Schema']>, 'action'>;
    Operation: DeduceOperation<this['Schema']>;
};

type DeduceProjection<SH extends EntityShape> = Partial<{
    '#id': NodeId;
} & {
    [K in keyof SH]: 1 | any;
} & ExprOp<keyof SH>>;

type AttrFilter<SH extends EntityShape> = {
    [K in keyof SH]: any;
}

export type DeduceFilter<SH extends EntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;

export type DeduceSorterAttr<SH extends EntityShape> = OneOf<{
    [K: string]: 1 | object | undefined;
} & ExprOp<keyof SH>>;

export type DeduceSorter<SH extends EntityShape> = Array<{
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
}>;

export type DeduceSelection<SH extends EntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceCreateOperationData<SH extends EntityShape> = FormCreateData<SH>;

export type DeduceCreateSingleOperation<SH extends EntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;

export type DeduceCreateMultipleOperation<SH extends EntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;

export type DeduceCreateOperation<SH extends EntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;

export type DeduceUpdateOperationData<SH extends EntityShape> = FormUpdateData<SH>;

export type DeduceUpdateOperation<SH extends EntityShape> = Operation<
    'update' | string,
    DeduceUpdateOperationData<SH>, DeduceFilter<SH>>;

export type DeduceRemoveOperationData<SH extends EntityShape> = {
    [A in keyof SH]?: any;
} & { [A: string]: any };

export type DeduceRemoveOperation<SH extends EntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>>;

export type DeduceOperation<SH extends EntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;

export interface OperationResult<ED extends {
    [K: string]: EntityDef;
}> {
    operations?: {                                          // cud返回的结果，select返回create
        [T in keyof ED]?: Array<ED[keyof ED]['Operation']>;
    };      // create/update/remove返回的动作结果
    ids?: string[];
    stats?: 'todo';
    errors?: Array<{
        code?: number;
        message: string;
    }>;
};

export type SelectionResult<ED extends {
    [K: string]: EntityDef;
}, T extends keyof ED> = {
    result: Array<Partial<ED[T]['Schema'] & {
        [A in ExpressionKey]?: any;
    }>>;
    stats?: 'todo';
    errors?: Array<{
        code?: number;
        message: string;
    }>;
}
