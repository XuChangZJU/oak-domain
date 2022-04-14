import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, FulltextFilter, MakeFilter, NodeId, Q_BooleanValue, Q_NumberValue, Q_StringValue } from './Demand';
import { OneOf } from './Polyfill';

export type TriggerDataAttribute = '$$triggerData$$';
export type TriggerTimestampAttribute = '$$triggerTimestamp$$';

type PrimaryKeyAttribute = 'id';
export type InstinctiveAttributes = PrimaryKeyAttribute | '$$createAt$$' | '$$updateAt$$' | '$$removeAt$$' | TriggerDataAttribute | TriggerTimestampAttribute;
export const initinctiveAttributes = ['id', '$$createAt$$', '$$updateAt$$', '$$removeAt$$', '$$triggerData$$', '$$triggerTimestamp$$'];

export type Filter<A extends string, F extends Object | undefined = undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};

type SelectOption = {
    forUpdate?: true;
    usingIndex?: 'todo';
};

export type OperateParams = {
    notCollect?: boolean;
};

export type FormUpdateData<SH extends GeneralEntityShape> = Partial<Omit<SH, InstinctiveAttributes>>;

export type FormCreateData<SH extends GeneralEntityShape> = Omit<SH, InstinctiveAttributes> & { id: string };

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
    id: string;
    $$createAt$$: number | Date;
    $$updateAt$$: number | Date;
    $$removeAt$$?: number | Date | null;
}

interface GeneralEntityShape extends EntityShape {
    [K: string]: any;
}

export interface EntityDef {
    // Name: E;
    Schema: GeneralEntityShape;
    OpSchema: GeneralEntityShape;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<this['Schema']>, 'action'>;
    Operation: DeduceOperation<this['Schema']>;
};

export interface EntityDict {
    [E: string]: EntityDef;
};

type DeduceProjection<SH extends GeneralEntityShape> = Partial<{
    '#id': NodeId;
} & {
    [K in keyof SH]: 1 | any;
} & ExprOp<keyof SH>>;

type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]: any;
}

export type DeduceFilter<SH extends GeneralEntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;

export type DeduceSorterAttr<SH extends GeneralEntityShape> = OneOf<{
    [K: string]: 1 | object | undefined;
} & ExprOp<keyof SH>>;

export type DeduceSorter<SH extends GeneralEntityShape> = Array<{
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
}>;

export type DeduceSelection<SH extends GeneralEntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceCreateOperationData<SH extends GeneralEntityShape> = FormCreateData<SH>;

export type DeduceCreateSingleOperation<SH extends GeneralEntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;

export type DeduceCreateMultipleOperation<SH extends GeneralEntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;

export type DeduceCreateOperation<SH extends GeneralEntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;

export type DeduceUpdateOperationData<SH extends GeneralEntityShape> = FormUpdateData<SH>;

export type DeduceUpdateOperation<SH extends GeneralEntityShape> = Operation<
    'update' | string,
    DeduceUpdateOperationData<SH>, DeduceFilter<SH>>;

export type DeduceRemoveOperationData<SH extends GeneralEntityShape> = {
    [A in keyof SH]?: any;
} & { [A: string]: any };

export type DeduceRemoveOperation<SH extends GeneralEntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>>;

export type DeduceOperation<SH extends GeneralEntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;

export type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'];
};

export type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u',
    e: T;
    d: FormUpdateData<ED[T]['OpSchema']>;
    f?: DeduceFilter<ED[T]['Schema']>;
};

export type RemoveOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'r',
    e: T;
    f?: DeduceFilter<ED[T]['Schema']>;
};

// Select的级联可以去重，压缩返回的数据大小
export type SelectOpResult<ED extends EntityDict> = {
    a: 's',
    d: {
        [T in keyof ED]?: {
            [ID: string]: ED[T]['OpSchema'];
        };
    };
}

export type OpRecord<ED extends EntityDict> = CreateOpResult<ED, keyof ED> | UpdateOpResult<ED, keyof ED> | RemoveOpResult<ED, keyof ED> | SelectOpResult<ED>;      // create/update/remove返回的动作结果

export interface OperationResult {
    ids?: string[];
};

/* export interface SelectionResult<ED extends EntityDict, T extends keyof ED> {
    result: Array<Partial<ED[T]['Schema'] & {
        [A in ExpressionKey]?: any;
    }>>;
} */

export type SelectRowShape<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    [K in keyof P]: K extends ExpressionKey ? any : K extends keyof E ? P[K] extends 1 ? E[K]: E[K] extends Array<any> ? Array<SelectRowShape<E[K][0], P[K]['data']>> : SelectRowShape<E[K], P[K]> : any;
}

export type SelectionResult2<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    result: Array<SelectRowShape<E, P>>;
}
