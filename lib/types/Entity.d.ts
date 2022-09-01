import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, MakeFilter, NodeId } from './Demand';
import { OneOf, OptionalKeys } from './Polyfill';
export declare type TriggerDataAttribute = '$$triggerData$$';
export declare type TriggerTimestampAttribute = '$$triggerTimestamp$$';
declare type PrimaryKeyAttribute = 'id';
export declare type InstinctiveAttributes = PrimaryKeyAttribute | '$$createAt$$' | '$$updateAt$$' | '$$deleteAt$$' | TriggerDataAttribute | TriggerTimestampAttribute;
export declare const initinctiveAttributes: string[];
export declare type Filter<A extends string, F extends Object | undefined = undefined> = {
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
    allowExists?: boolean;
    modiParentId?: string;
    modiParentEntity?: string;
    dummy?: 1;
};
export declare type FormUpdateData<SH extends GeneralEntityShape> = Partial<{
    [K in keyof Omit<SH, InstinctiveAttributes>]: SH[K] | null;
}>;
export declare type FormCreateData<SH extends GeneralEntityShape> = Omit<SH, InstinctiveAttributes> & {
    id: string;
};
export declare type Operation<A extends GenericAction | string, DATA extends Object, FILTER extends Object | undefined = undefined, SORTER extends Object | undefined = undefined> = {
    id: string;
    action: A;
    data: DATA;
    sorter?: SORTER;
} & Filter<A, FILTER>;
export declare type Selection<DATA extends Object, FILTER extends Object | undefined = undefined, SORT extends Object | undefined = undefined> = Omit<Operation<'select', DATA, FILTER, SORT>, 'id'>;
export interface EntityShape {
    id: string;
    $$createAt$$: number | Date;
    $$updateAt$$: number | Date;
    $$deleteAt$$?: number | Date | null;
}
export interface FileCarrierEntityShape extends EntityShape {
}
interface GeneralEntityShape extends EntityShape {
    [K: string]: any;
}
export declare type MakeAction<A extends string> = A;
export interface EntityDef {
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
}
export interface EntityDict {
    [E: string]: EntityDef;
}
export interface OtmSubProjection extends Omit<DeduceSelection<any>, 'action'> {
    $entity: string;
}
declare type DeduceProjection<SH extends GeneralEntityShape> = {
    '#id'?: NodeId;
} & {
    [K in keyof SH]?: 1 | OtmSubProjection | any;
} & Partial<ExprOp<keyof SH>>;
export declare type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]: any;
};
export declare type DeduceFilter<SH extends GeneralEntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;
export declare type DeduceSorterAttr<SH extends GeneralEntityShape> = OneOf<{
    [K: string]: 1 | object | undefined;
} & ExprOp<keyof SH>>;
export declare type DeduceSorterItem<SH extends GeneralEntityShape> = {
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
};
export declare type DeduceSorter<SH extends GeneralEntityShape> = Array<DeduceSorterItem<SH>>;
export declare type DeduceSelection<SH extends GeneralEntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;
export declare type DeduceCreateOperationData<SH extends GeneralEntityShape> = {
    id: string;
} & {
    [k in keyof Omit<SH, InstinctiveAttributes>]?: any;
};
export declare type DeduceCreateSingleOperation<SH extends GeneralEntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;
export declare type DeduceCreateMultipleOperation<SH extends GeneralEntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;
export declare type DeduceCreateOperation<SH extends GeneralEntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;
export declare type DeduceUpdateOperationData<SH extends GeneralEntityShape> = {
    [k in keyof Omit<SH, InstinctiveAttributes>]?: any;
};
export declare type DeduceUpdateOperation<SH extends GeneralEntityShape> = Operation<'update' | string, DeduceUpdateOperationData<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;
export declare type DeduceRemoveOperationData<SH extends GeneralEntityShape> = {
    [A in keyof Omit<SH, InstinctiveAttributes>]?: any;
};
export declare type DeduceRemoveOperation<SH extends GeneralEntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;
export declare type DeduceOperation<SH extends GeneralEntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;
export declare type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'] | ED[T]['OpSchema'][];
};
export declare type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u';
    e: T;
    d: DeduceUpdateOperationData<ED[T]['Schema']>;
    f?: DeduceFilter<ED[T]['Schema']>;
};
export declare type RemoveOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'r';
    e: T;
    f?: DeduceFilter<ED[T]['Schema']>;
};
export declare type SelectOpResult<ED extends EntityDict> = {
    a: 's';
    d: {
        [T in keyof ED]?: {
            [ID: string]: ED[T]['OpSchema'];
        };
    };
};
export declare type OpRecord<ED extends EntityDict> = CreateOpResult<ED, keyof ED> | UpdateOpResult<ED, keyof ED> | RemoveOpResult<ED, keyof ED> | SelectOpResult<ED>;
export declare type OperationResult<ED extends EntityDict> = {
    [K in keyof ED]?: {
        [A in ED[K]['Action']]?: number;
    };
};
export declare type SelectRowShape<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    [K in keyof P]: K extends ExpressionKey ? any : (K extends keyof E ? (P[K] extends 1 | undefined ? E[K] : (P[K] extends OtmSubProjection ? SelectRowShape<Required<E>[K][0], P[K]['data']>[] | Array<never> : (K extends OptionalKeys<E> ? SelectRowShape<NonNullable<Required<E>[K]>, P[K]> | null : SelectRowShape<NonNullable<Required<E>[K]>, P[K]>))) : never);
};
export declare type SelectionResult<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    result: Array<SelectRowShape<E, P>>;
};
export declare type ActionType = 'readOnly' | 'appendOnly' | 'excludeUpdate' | 'excludeRemove' | 'crud';
export {};
