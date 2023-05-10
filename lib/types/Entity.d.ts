import { ReadOnlyAction } from '../actions/action';
import { PrimaryKey, Sequence } from './DataType';
declare type TriggerDataAttributeType = '$$triggerData$$';
declare type TriggerTimestampAttributeType = '$$triggerTimestamp$$';
declare type PrimaryKeyAttributeType = 'id';
declare type CreateAtAttributeType = '$$createAt$$';
declare type UpdateAtAttributeType = '$$updateAt$$';
declare type DeleteAtAttributeType = '$$deleteAt$$';
declare type SeqAttributeType = '$$seq$$';
export declare const TriggerDataAttribute = "$$triggerData$$";
export declare const TriggerTimestampAttribute = "$$triggerTimestamp$$";
export declare const PrimaryKeyAttribute = "id";
export declare const CreateAtAttribute = "$$createAt$$";
export declare const UpdateAtAttribute = "$$updateAt$$";
export declare const DeleteAtAttribute = "$$deleteAt$$";
export declare const SeqAttribute = "$$seq$$";
export declare type InstinctiveAttributes = PrimaryKeyAttributeType | CreateAtAttributeType | UpdateAtAttributeType | DeleteAtAttributeType | TriggerDataAttributeType | TriggerTimestampAttributeType | SeqAttributeType;
export declare const initinctiveAttributes: string[];
declare type FilterPart<A extends string, F extends Object | undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};
export declare type SelectOption = {
    dontCollect?: boolean;
    blockTrigger?: true;
    obscure?: boolean;
    forUpdate?: true;
    includedDeleted?: true;
    dummy?: 1;
};
export declare type OperateOption = {
    blockTrigger?: true;
    dontCollect?: boolean;
    dontCreateOper?: boolean;
    dontCreateModi?: boolean;
    allowExists?: boolean;
    modiParentId?: string;
    modiParentEntity?: string;
    deletePhysically?: boolean;
    dummy?: 1;
};
export declare type FormUpdateData<SH extends GeneralEntityShape> = Partial<{
    [K in keyof Omit<SH, InstinctiveAttributes>]: SH[K] | null;
}>;
export declare type FormCreateData<SH extends GeneralEntityShape> = Partial<Omit<SH, InstinctiveAttributes>> & {
    id: string;
};
export declare type Operation<A extends string, D extends Projection, F extends Filter | undefined = undefined, S extends Sorter | undefined = undefined> = {
    id: string;
    action: A;
    data: D;
    sorter?: S;
} & FilterPart<A, F>;
export declare type Selection<A extends ReadOnlyAction, D extends Projection, F extends Filter | undefined = undefined, S extends Sorter | undefined = undefined> = {
    id?: string;
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
export interface GeneralEntityShape extends EntityShape {
    [K: string]: any;
}
export declare type MakeAction<A extends string> = A;
export interface EntityDef {
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
}
export interface EntityDict {
    [E: string]: EntityDef;
}
export interface OtmSubProjection extends Omit<Operation<'select', any, any, any>, 'action'> {
    $entity: string;
}
export declare type AggregationOp = `#max-${number}` | `#min-${number}` | `#avg-${number}` | `#count-${number}` | `#sum-${number}`;
export declare type DeduceAggregationData<P extends Projection> = {
    [A in AggregationOp]?: P;
} & {
    '#aggr'?: P;
};
export declare type AggregationResult<SH extends GeneralEntityShape> = Array<{
    [A in AggregationOp]?: number | string;
} & {
    '#data'?: Partial<SH>;
}>;
export declare type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]?: any;
};
declare type SortAttr = {
    [K: string]: any;
};
declare type SorterItem = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
declare type Sorter = Array<SorterItem>;
declare type Filter = {
    [K: string]: any;
};
declare type Projection = {
    [K: string]: any;
};
export declare type DeduceAggregation<P extends Projection, F extends Filter, S extends Sorter> = Omit<Selection<'aggregate', DeduceAggregationData<P>, F, S>, 'action'>;
declare type CreateOperationData = {
    id: string;
    [K: string]: any;
};
declare type CreateSingleOperation = Operation<'create', CreateOperationData, undefined, undefined>;
declare type CreateMultipleOperation = Operation<'create', Array<CreateOperationData>, undefined, undefined>;
declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = {
    id?: never;
    [k: string]: any;
};
export declare type UpdateOperation = Operation<string, UpdateOperationData, Filter, Sorter>;
declare type RemoveOperationData = {
    [k: string]: any;
};
export declare type RemoveOperation = Operation<'remove', RemoveOperationData, Filter, Sorter>;
export declare type CUDOperation = CreateOperation | UpdateOperation | RemoveOperation;
export declare type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'] | ED[T]['OpSchema'][];
};
export declare type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u';
    e: T;
    d: UpdateOperationData;
    f?: Filter;
};
export declare type RemoveOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'r';
    e: T;
    f?: Filter;
};
export declare type RelationHierarchy<R extends string> = {
    [K in R]?: R[];
};
export declare type CascadeRelationItem = {
    cascadePath: string;
    relations?: string[];
};
export declare type CascadeRelationAuth<R extends string> = {
    [K in R]?: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[];
};
export declare type SelectOpResult<ED extends EntityDict> = {
    a: 's';
    d: {
        [T in keyof ED]?: {
            [ID: string]: Partial<ED[T]['OpSchema']>;
        };
    };
};
export declare type OpRecord<ED extends EntityDict> = CreateOpResult<ED, keyof ED> | UpdateOpResult<ED, keyof ED> | RemoveOpResult<ED, keyof ED> | SelectOpResult<ED>;
export declare type OperationResult<ED extends EntityDict> = {
    [K in keyof ED]?: {
        [A in ED[K]['Action']]?: number;
    };
};
export declare type ActionType = 'readOnly' | 'appendOnly' | 'excludeUpdate' | 'excludeRemove' | 'crud';
export declare type Configuration = {
    actionType?: ActionType;
    static?: boolean;
};
export declare type AuthCascadePath<ED extends EntityDict> = [keyof ED, string, keyof ED, boolean];
export declare type AuthDeduceRelationMap<ED extends EntityDict> = {
    [T in keyof ED]?: keyof ED[T]['OpSchema'];
};
export {};
