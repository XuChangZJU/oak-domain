import { ReadOnlyAction } from '../actions/action';
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

type FilterPart<A extends string, F extends Object | undefined> = {
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

export type FormCreateData<SH extends GeneralEntityShape> = Partial<Omit<SH, InstinctiveAttributes>> & { id: string };

export type Operation<A extends string,
    D extends Projection,
    F extends Filter | undefined = undefined,
    S extends Sorter | undefined = undefined> = {
        id: string;     // 为了一致性，每个operation也应当保证唯一id
        action: A;
        data: D;
        sorter?: S;
    } & FilterPart<A, F>;

export type Selection<A extends ReadOnlyAction, 
    D extends Projection,
    F extends Filter | undefined = undefined,
    S extends Sorter | undefined = undefined> = {
        id?: string;     // selection的id可传可不传，如果传意味着该select会记录在oper中
        action: A;
        data: D;
        sorter?: S;
    } & FilterPart<A, F>;

export interface EntityShape {
    id: PrimaryKey;
    $$seq$$: Sequence;
    $$createAt$$: number | Date;
    $$updateAt$$: number | Date;
    $$deleteAt$$?: number | Date | null;
}

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
    Selection: Omit<Selection<'select', Projection, Filter, Sorter>, 'action'>;
    Aggregation: DeduceAggregation<Projection, Filter, Sorter>;
    Operation: CUDOperation;
    Create: CreateOperation;
    CreateSingle: CreateSingleOperation;
    CreateMulti: CreateMultipleOperation;
    Update: UpdateOperation;
    Remove: RemoveOperation;
    Relation?: string;
};

export interface EntityDict {
    [E: string]: EntityDef;
};

export interface OtmSubProjection extends Omit<Operation<'select', any, any, any>, 'action'> {
    $entity: string;
};

export type AggregationOp = `#max-${number}` | `#min-${number}` | `#avg-${number}` | `#count-${number}` | `#sum-${number}`;

export type DeduceAggregationData<P extends Projection> = {
    [A in AggregationOp]?: P;
} & {
    '#aggr'?: P;
};

export type AggregationResult<SH extends GeneralEntityShape> = Array<{
    [A in AggregationOp]?: number | string;
} & {
    '#data'?: Partial<SH>
}>;

export type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]?: any;
}

type SortAttr = {
    [K: string]: any;
};

type SorterItem = {
    $attr: SortAttr
    $direction?: "asc" | "desc";
};

type Sorter = Array<SorterItem>;

type Filter = {
    [K: string]: any;
}

type Projection = {
    [K: string]: any;
}

export type DeduceAggregation<
    P extends Projection,
    F extends Filter,
    S extends Sorter> = Omit<Selection<'aggregate', DeduceAggregationData<P>, F, S>, 'action'>;

type CreateOperationData = {
    id: string;
    [K: string]: any;
};

type CreateSingleOperation = Operation<'create', CreateOperationData, undefined, undefined>;

type CreateMultipleOperation = Operation<'create', Array<CreateOperationData>, undefined, undefined>;

type CreateOperation = CreateSingleOperation | CreateMultipleOperation;

type UpdateOperationData = {
    id?: never;
    [k: string]: any;
}

export type UpdateOperation = Operation<string, UpdateOperationData, Filter, Sorter>;

type RemoveOperationData = {
    [k: string]: any;
}

export type RemoveOperation = Operation<'remove', RemoveOperationData, Filter, Sorter>;

export type CUDOperation = CreateOperation | UpdateOperation | RemoveOperation;

export type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'] | ED[T]['OpSchema'][];
};

export type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u',
    e: T;
    d: UpdateOperationData;
    f?: Filter;
};

export type RemoveOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'r',
    e: T;
    f?: Filter;
};

export type RelationHierarchy<R extends string> = {
    [K in R]?: R[];
};

export type CascadeRelationItem = {
    cascadePath: string;
    relations?: string[];
};

export type CascadeRelationAuth<R extends string> = {
    [K in R]?: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[];
};

// Select的级联可以去重，压缩返回的数据大小
export type SelectOpResult<ED extends EntityDict> = {
    a: 's',
    d: {
        [T in keyof ED]?: {
            [ID: string]: Partial<ED[T]['OpSchema']>;
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
