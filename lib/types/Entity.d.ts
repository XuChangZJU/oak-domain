import { OneOf } from '.';
import { ReadOnlyAction } from '../actions/action';
import { PrimaryKey, Sequence } from './DataType';
type TriggerDataAttributeType = '$$triggerData$$';
type TriggerUuidAttributeType = '$$triggerUuid$$';
type PrimaryKeyAttributeType = 'id';
type CreateAtAttributeType = '$$createAt$$';
type UpdateAtAttributeType = '$$updateAt$$';
type DeleteAtAttributeType = '$$deleteAt$$';
type SeqAttributeType = '$$seq$$';
export declare const TriggerDataAttribute = "$$triggerData$$";
export declare const TriggerUuidAttribute = "$$triggerUuid$$";
export declare const PrimaryKeyAttribute = "id";
export declare const CreateAtAttribute = "$$createAt$$";
export declare const UpdateAtAttribute = "$$updateAt$$";
export declare const DeleteAtAttribute = "$$deleteAt$$";
export declare const SeqAttribute = "$$seq$$";
export type InstinctiveAttributes = PrimaryKeyAttributeType | CreateAtAttributeType | UpdateAtAttributeType | DeleteAtAttributeType | TriggerDataAttributeType | SeqAttributeType | TriggerUuidAttributeType;
export declare const initinctiveAttributes: string[];
type FilterPart<A extends string, F extends Object | undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};
export type SelectOption = {
    dontCollect?: boolean;
    blockTrigger?: true;
    obscure?: boolean;
    forUpdate?: true | 'skip locked' | 'nowait';
    includedDeleted?: true;
    ignoreAttrMiss?: true;
    dummy?: 1;
};
export type OperateOption = {
    blockTrigger?: true;
    dontCollect?: boolean;
    dontCreateOper?: boolean;
    includedDeleted?: true;
    allowExists?: boolean;
    modiParentId?: string;
    modiParentEntity?: string;
    deletePhysically?: boolean;
    applyingModi?: boolean;
    dummy?: 1;
};
export type FormUpdateData<SH extends GeneralEntityShape> = Partial<{
    [K in keyof Omit<SH, "id" | "$$createAt$$" | "$$seq$$">]: SH[K] | null;
}>;
export type FormCreateData<SH extends GeneralEntityShape> = Partial<SH> & {
    id: string;
};
export type Operation<A extends string, D extends Projection, F extends Filter | undefined = undefined, S extends Sorter | undefined = undefined> = {
    id: string;
    action: A;
    data: D;
    sorter?: S;
    bornAt?: number;
} & FilterPart<A, F>;
export type Selection<A extends ReadOnlyAction, D extends Projection, F extends Filter | undefined = undefined, S extends Sorter | undefined = undefined> = {
    id?: string;
    action?: A;
    data: D;
    sorter?: S;
} & FilterPart<A, F> & {
    randomRange?: number;
    total?: number;
    distinct?: true;
};
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
export type MakeAction<A extends string> = A;
export interface EntityDef {
    Schema: GeneralEntityShape;
    OpSchema: GeneralEntityShape;
    Action: string;
    ParticularAction?: string;
    Selection: Selection<'select', Projection, Filter, Sorter>;
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
export type AggregationOp = `#max-${number}` | `#min-${number}` | `#avg-${number}` | `#count-${number}` | `#sum-${number}`;
export type DeduceAggregationData<P extends Projection> = {
    [A in AggregationOp]?: P;
} & OneOf<{
    distinct?: true;
    '#aggr'?: P;
}>;
export type AggregationResult<SH extends GeneralEntityShape> = Array<{
    [A in AggregationOp]?: number | string;
} & {
    '#data'?: Partial<SH>;
}>;
export type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]?: any;
};
type SortAttr = {
    [K: string]: any;
};
type SorterItem = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
type Sorter = Array<SorterItem>;
type Filter = {
    [K: string]: any;
};
type Projection = {
    [K: string]: any;
};
export type DeduceAggregation<P extends Projection, F extends Filter, S extends Sorter> = Omit<Selection<'aggregate', DeduceAggregationData<P>, F, S>, 'action'>;
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
};
export type UpdateOperation = Operation<string, UpdateOperationData, Filter, Sorter>;
type RemoveOperationData = {
    [k: string]: any;
};
export type RemoveOperation = Operation<'remove', RemoveOperationData, Filter, Sorter>;
export type CUDOperation = CreateOperation | UpdateOperation | RemoveOperation;
export type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    id: string;
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'] | ED[T]['OpSchema'][];
};
export type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    id: string;
    a: 'u';
    e: T;
    d: UpdateOperationData;
    f?: Filter;
};
export type RemoveOpResult<ED extends EntityDict, T extends keyof ED> = {
    id: string;
    a: 'r';
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
export type SelectOpResult<ED extends EntityDict> = {
    a: 's';
    d: {
        [T in keyof ED]?: {
            [ID: string]: Partial<ED[T]['OpSchema']>;
        };
    };
};
export type OpRecord<ED extends EntityDict> = CreateOpResult<ED, keyof ED> | UpdateOpResult<ED, keyof ED> | RemoveOpResult<ED, keyof ED> | SelectOpResult<ED>;
export type OperationResult<ED extends EntityDict> = {
    [K in keyof ED]?: {
        [A in ED[K]['Action']]?: number;
    };
};
export type ActionType = 'readOnly' | 'appendOnly' | 'excludeUpdate' | 'excludeRemove' | 'crud';
export type Configuration = {
    actionType?: ActionType;
    static?: boolean;
};
export type AuthDeduceRelationMap<ED extends EntityDict> = {
    [T in keyof ED]?: keyof ED[T]['OpSchema'];
};
export type SelectFreeEntities<ED extends EntityDict> = (keyof ED)[];
export type UpdateFreeDict<ED extends EntityDict> = {
    [A in keyof ED]?: string[];
};
export type OtmKey<K extends string> = K | `${K}$${number}`;
export interface SubDataDef<ED extends EntityDict, T extends keyof ED> {
    id: string;
    entity: T;
    filter: ED[T]['Selection']['filter'];
}
export {};
