import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, FulltextFilter, MakeFilter, NodeId, Q_BooleanValue, Q_NumberValue, Q_StringValue } from './Demand';
import { OneOf, OptionalKeys } from './Polyfill';

export type TriggerDataAttribute = '$$triggerData$$';
export type TriggerTimestampAttribute = '$$triggerTimestamp$$';

type PrimaryKeyAttribute = 'id';
export type InstinctiveAttributes = PrimaryKeyAttribute | '$$createAt$$' | '$$updateAt$$' | '$$deleteAt$$' | TriggerDataAttribute | TriggerTimestampAttribute;
export const initinctiveAttributes = ['id', '$$createAt$$', '$$updateAt$$', '$$deleteAt$$', '$$triggerData$$', '$$triggerTimestamp$$'];

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
    obscure?: boolean;      // 如果为置为true，则在filter过程中因数据不完整而不能判断为真的时候都假设为真（前端缓存）
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
    $$deleteAt$$?: number | Date | null;
}

export interface FileCarrierEntityShape extends EntityShape {
};

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
    Create: DeduceCreateOperation<this['Schema']>;
    CreateSingle: DeduceCreateSingleOperation<this['Schema']>;
    CreateMulti: DeduceCreateMultipleOperation<this['Schema']>;
    Update: DeduceUpdateOperation<this['Schema']>;
    Remove: DeduceRemoveOperation<this['Schema']>;
};

export interface EntityDict {
    [E: string]: EntityDef;
};

export interface OtmSubProjection extends Omit<DeduceSelection<any>, 'action'> {
    $entity: string;
};

type DeduceProjection<SH extends GeneralEntityShape> = Partial<{
    '#id': NodeId;
} & {
    [K in keyof SH]: 1 | OtmSubProjection | any;
} & ExprOp<keyof SH>>;

export type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]: any;
}

export type DeduceFilter<SH extends GeneralEntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;

export type DeduceSorterAttr<SH extends GeneralEntityShape> = OneOf<{
    [K: string]: 1 | object | undefined;
} & ExprOp<keyof SH>>;

export type DeduceSorterItem<SH extends GeneralEntityShape> = {
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
};

export type DeduceSorter<SH extends GeneralEntityShape> = Array<DeduceSorterItem<SH>>;

export type DeduceSelection<SH extends GeneralEntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceCreateOperationData<SH extends GeneralEntityShape> = FormCreateData<SH> & {
    [k: string]: any;
};

export type DeduceCreateSingleOperation<SH extends GeneralEntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;

export type DeduceCreateMultipleOperation<SH extends GeneralEntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;

export type DeduceCreateOperation<SH extends GeneralEntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;

export type DeduceUpdateOperationData<SH extends GeneralEntityShape> = FormUpdateData<SH> & {
    [k: string]: any;
};

export type DeduceUpdateOperation<SH extends GeneralEntityShape> = Operation<
    'update' | string,
    DeduceUpdateOperationData<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceRemoveOperationData<SH extends GeneralEntityShape> = {
    [A in keyof SH]?: any;
} & { [A: string]: any };

export type DeduceRemoveOperation<SH extends GeneralEntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceOperation<SH extends GeneralEntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;

export type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'] | ED[T]['OpSchema'][];
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

export type OperationResult<ED extends EntityDict> = {
    [K in keyof ED]?: {
        [A in ED[K]['Action']]?: number
    };
};

/* export interface SelectionResult<ED extends EntityDict, T extends keyof ED> {
    result: Array<Partial<ED[T]['Schema'] & {
        [A in ExpressionKey]?: any;
    }>>;
} */

export type SelectRowShape<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    [K in keyof P]: K extends ExpressionKey ? any : 
        (K extends keyof E ? 
            (P[K] extends 1 | undefined ? E[K] : 
                (P[K] extends OtmSubProjection ? SelectRowShape<Required<E>[K][0], P[K]['data']>[] | Array<never> : 
                    (K extends OptionalKeys<E> ? SelectRowShape<NonNullable<Required<E>[K]>, P[K]> | null : SelectRowShape<NonNullable<Required<E>[K]>, P[K]>)
                )
            ) : never
        );
}

export type SelectionResult<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    result: Array<SelectRowShape<E, P>>;
}
