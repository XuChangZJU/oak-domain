import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, FulltextFilter, MakeFilter, NodeId, Q_BooleanValue, Q_NumberValue, Q_StringValue } from './Demand';
import { OneOf, OptionalKeys } from './Polyfill';
import { PrimaryKey, Sequence } from './DataType';

type TriggerDataAttributeType = '$$triggerData$$';
type TriggerTimestampAttributeType = '$$triggerTimestamp$$';
type PrimaryKeyAttributeType = 'id';
type CreateAtAttributeType = '$$createAt$$';
type UpdateAtAttributeType = '$$updateAt$$';
type DeleteAtAttributeType = '$$deleteAt$$';
type SeqAttributeType = '$$seq$$';

export const TriggerDataAttribute = '$$triggerData$$';
export const TriggerTimestampAttribute = '$$triggerTimestamp$$';
export const PrimaryKeyAttribute = 'id';
export const CreateAtAttribute = '$$createAt$$';
export const UpdateAtAttribute = '$$updateAt$$';
export const DeleteAtAttribute = '$$deleteAt$$';
export const SeqAttribute = '$$seq$$';

export type InstinctiveAttributes = PrimaryKeyAttributeType | CreateAtAttributeType | UpdateAtAttributeType| DeleteAtAttributeType | TriggerDataAttributeType | TriggerTimestampAttributeType | SeqAttributeType;
export const initinctiveAttributes = [PrimaryKeyAttribute, TriggerDataAttribute, TriggerTimestampAttribute, CreateAtAttribute, UpdateAtAttribute, DeleteAtAttribute, SeqAttribute];

export type Filter<A extends string, F extends Object | undefined = undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};

export type SelectOption = {
    dontCollect?: boolean;
    blockTrigger?: true;
    obscure?: boolean;      // 如果为置为true，则在filter过程中因数据不完整而不能判断为真的时候都假设为真（前端缓存专用）
    forUpdate?: true;
    includedDeleted?: true; // 是否包含删除行的信息
    dummy?: 1;           // 无用，为了继承Option通过编译
};

export type OperateOption = {
    blockTrigger?: true;
    dontCollect?: boolean;
    dontCreateOper?: boolean;
    dontCreateModi?: boolean;
    allowExists?: boolean;      // 插入时允许已经存在唯一键值的行了，即insert / update逻辑
    modiParentId?: string;      // 如果是延时更新，相关modi要关联到一个父亲上统一应用
    modiParentEntity?: string;  // 如果是延时更新，相关modi要关联到一个父亲上统一应用
    dummy?: 1;          // 无用，为了继承Option通过编译
};

export type FormUpdateData<SH extends GeneralEntityShape> = Partial<{
    [K in keyof Omit<SH, InstinctiveAttributes>]: SH[K] | null;
}>;

export type FormCreateData<SH extends GeneralEntityShape> = Omit<SH, InstinctiveAttributes> & { id: string };

export type Operation<A extends GenericAction | string,
    DATA extends Object,
    FILTER extends Object | undefined = undefined,
    SORTER extends Object | undefined = undefined> = {
        id?: string;     // 为了一致性，每个operation也应当保证唯一id
        action: A;
        data: DATA;
        sorter?: SORTER;
    } & Filter<A, FILTER>;

export type Selection<DATA extends Object,
    FILTER extends Object | undefined = undefined,
    SORT extends Object | undefined = undefined> = Operation<'select', DATA, FILTER, SORT>;

export interface EntityShape {
    id: PrimaryKey;
    $$seq$$: Sequence;
    $$createAt$$: number | Date;
    $$updateAt$$: number | Date;
    $$deleteAt$$?: number | Date | null;
}

export interface FileCarrierEntityShape extends EntityShape {
};

interface GeneralEntityShape extends EntityShape {
    [K: string]: any;
}

export type MakeAction<A extends string> = A;

export interface EntityDef {
    // Name: E;
    Schema: GeneralEntityShape;
    OpSchema: GeneralEntityShape;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<this['Schema']>, 'action'>;
    Aggregation: Omit<DeduceAggregation<this['Schema'], DeduceProjection<this['Schema']>, DeduceFilter<this['Schema']>, DeduceSorter<this['Schema']>>, 'action'>;
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

type DeduceProjection<SH extends GeneralEntityShape> = {
    '#id'?: NodeId;
} & {
    [K in keyof SH]?: number | OtmSubProjection | any;
} & Partial<ExprOp<keyof SH | string>>;

export type AggregationOp = `$max-${number}` | `$min-${number}` | `$avg-${number}` | `$count-${number}` | `$sum-${number}`;

export type DeduceAggregationData<SH extends GeneralEntityShape, P extends DeduceProjection<SH>> = {
    [A in AggregationOp]?: P;
} & {
    $aggr?: P;
};

export type AggregationResult<SH extends GeneralEntityShape> = Array<{
    [A in AggregationOp]?: number | string;
} & {
    data?: Partial<SH>
}>;

export type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]: any;
}

export type DeduceFilter<SH extends GeneralEntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;

export type DeduceSorterAttr<SH extends GeneralEntityShape> = OneOf<{
    [K: string]: number | object | undefined;
} & ExprOp<keyof SH>>;

export type DeduceSorterItem<SH extends GeneralEntityShape> = {
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
};

export type DeduceSorter<SH extends GeneralEntityShape> = Array<DeduceSorterItem<SH>>;

export type DeduceSelection<SH extends GeneralEntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceAggregation<
    SH extends GeneralEntityShape,
    P extends DeduceProjection<SH>,
    F extends DeduceFilter<SH>,
    S extends DeduceSorter<SH>> = Omit<Operation<'aggregate', DeduceAggregationData<SH, P>, F, S>, 'action'>;

export type DeduceCreateOperationData<SH extends GeneralEntityShape> = {
    id: string;
} & {
    [k in keyof Omit<SH, InstinctiveAttributes>]?: any;
};

export type DeduceCreateSingleOperation<SH extends GeneralEntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;

export type DeduceCreateMultipleOperation<SH extends GeneralEntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;

export type DeduceCreateOperation<SH extends GeneralEntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;

export type DeduceUpdateOperationData<SH extends GeneralEntityShape> = {
    [k in keyof Omit<SH, InstinctiveAttributes>]?: any;
};

export type DeduceUpdateOperation<SH extends GeneralEntityShape> = Operation<
    'update' | string,
    DeduceUpdateOperationData<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceRemoveOperationData<SH extends GeneralEntityShape> = {
    [A in keyof Omit<SH, InstinctiveAttributes>]?: any;
};

export type DeduceRemoveOperation<SH extends GeneralEntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;

export type DeduceOperation<SH extends GeneralEntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH>;

export type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'] | ED[T]['OpSchema'][];
};

export type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u',
    e: T;
    d: DeduceUpdateOperationData<ED[T]['Schema']>;
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

/* export type SelectRowShape<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
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
} */

export type ActionType = 'readOnly' | 'appendOnly' | 'excludeUpdate' | 'excludeRemove' | 'crud';       // 只读型、只插入型、没有更新型、没有删除型、所有型

export type Configuration = {
    actionType?: ActionType;
    static?: boolean;    // 标识是维表（变动较小，相对独立）
};

export type Exportation<ED extends EntityDict, T extends keyof ED, K extends string> = {
    name: string;
    id: string;
    entity: T;
    projection: ED[T]['Selection']['data'];
    header: K[];
    fn: (data: ED[T]['Schema']) => Record<K, string | number | boolean | null>;
};

export type Importation<ED extends EntityDict, T extends keyof ED, K extends string> = {
    name: string;
    id: string;
    entity: T;
    header: K[];
    fn: (data: Record<K, string | number | boolean>) => ED[T]['CreateSingle']['data'];
};
