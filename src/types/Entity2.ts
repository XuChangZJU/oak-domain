import { GenericAction } from '../actions/action';
import { DataTypes } from './DataType';
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
    [A in keyof SH]?: SH[A] | null | object;
} & { id?: undefined } & { [A: string]: any };

export type FormCreateData<SH extends EntityShape> = {
    [A in keyof SH]?: SH[A] | undefined | object;
} & { id: string } & { [A: string]: any };

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
}

export interface EntityDef<SH extends EntityShape = EntityShape> {
    // Name: E;
    Schema: SH;
    OpSchema: Partial<SH>;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<SH>, 'action'>;
    Operation: DeduceOperation<SH>;    
};

type DeduceProjection<SH extends EntityShape = EntityShape> = {
    '#id'?: NodeId;
} & {
    [K in keyof SH]?: 1 | object;
} & ExprOp<keyof SH>;

type AttrFilter<SH extends EntityShape = EntityShape> = {
    [K in keyof SH]: object;
}

export type DeduceFilter<SH extends EntityShape = EntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;

export type DeduceSorterAttr<SH extends EntityShape = EntityShape> = OneOf<{
    [K in keyof SH]: 1 | object;
} & ExprOp<keyof SH>;

export type DeduceSorter<SH extends EntityShape = EntityShape> = Array<{
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
}>;

export type DeduceSelection<SH extends EntityShape = EntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceCreateOperationData<SH extends EntityShape = EntityShape> = FormCreateData<SH>;

export type DeduceCreateSingleOperation<SH extends EntityShape = EntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;

export type DeduceCreateMultipleOperation<SH extends EntityShape = EntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;

export type DeduceCreateOperation<SH extends EntityShape = EntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;

export type DeduceUpdateOperationData<SH extends EntityShape = EntityShape> = FormUpdateData<SH>;

export type DeduceUpdateOperation<SH extends EntityShape = EntityShape> = Operation<
    'update' | string,
    DeduceUpdateOperationData<SH>, DeduceFilter<SH>>;

export type DeduceRemoveOperationData<SH extends EntityShape = EntityShape> = {
    [A in keyof SH]?: Object;
} & { [A: string]: any };

export type DeduceRemoveOperation<SH extends EntityShape = EntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>>;

export type DeduceOperation<SH extends EntityShape = EntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;

export interface OperationResult<ED extends {
    [K: string]: EntityDef<SH>;
}, SH extends EntityShape = EntityShape> {
    operations?: {                                          // cud返回的结果，select返回create
        [T in keyof ED]?: Array<EntityDef<SH>['Operation']>;
    };      // create/update/remove返回的动作结果
    ids?: string[];
    stats?: 'todo';
    errors?: Array<{
        code?: number;
        message: string;
    }>;
};


export type SelectionResult<ED extends {
    [K: string]: EntityDef<SH>;
}, T extends keyof ED, SH extends EntityShape = EntityShape> = Array<Partial<ED[T]['Schema'] & {
    [A in ExpressionKey]?: any;
}>>;
