import { GenericAction } from '../actions/action';
import { ExpressionKey, ExprOp, MakeFilter, NodeId } from './Demand';
import { OneOf } from './Polyfill';
export declare type TriggerDataAttribute = '$$triggerData$$';
export declare type TriggerTimestampAttribute = '$$triggerTimestamp$$';
declare type PrimaryKeyAttribute = 'id';
export declare type InstinctiveAttributes = PrimaryKeyAttribute | '$$createAt$$' | '$$updateAt$$' | '$$removeAt$$' | TriggerDataAttribute | TriggerTimestampAttribute;
export declare const initinctiveAttributes: string[];
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
export declare type FormUpdateData<SH extends GeneralEntityShape> = Partial<Omit<SH, InstinctiveAttributes>>;
export declare type FormCreateData<SH extends GeneralEntityShape> = Omit<SH, InstinctiveAttributes> & {
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
    id: string;
    $$createAt$$: number | Date;
    $$updateAt$$: number | Date;
    $$removeAt$$?: number | Date | null;
}
interface GeneralEntityShape extends EntityShape {
    [K: string]: any;
}
export interface EntityDef {
    Schema: GeneralEntityShape;
    OpSchema: GeneralEntityShape;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<this['Schema']>, 'action'>;
    Operation: DeduceOperation<this['Schema']>;
}
export interface EntityDict {
    [E: string]: EntityDef;
}
declare type DeduceProjection<SH extends GeneralEntityShape> = Partial<{
    '#id': NodeId;
} & {
    [K in keyof SH]: 1 | any;
} & ExprOp<keyof SH>>;
declare type AttrFilter<SH extends GeneralEntityShape> = {
    [K in keyof SH]: any;
};
export declare type DeduceFilter<SH extends GeneralEntityShape> = MakeFilter<AttrFilter<SH> & ExprOp<keyof SH>>;
export declare type DeduceSorterAttr<SH extends GeneralEntityShape> = OneOf<{
    [K: string]: 1 | object | undefined;
} & ExprOp<keyof SH>>;
export declare type DeduceSorter<SH extends GeneralEntityShape> = Array<{
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
}>;
export declare type DeduceSelection<SH extends GeneralEntityShape> = Selection<DeduceProjection<SH>, DeduceFilter<SH>, DeduceSorter<SH>>;
export declare type DeduceCreateOperationData<SH extends GeneralEntityShape> = FormCreateData<SH>;
export declare type DeduceCreateSingleOperation<SH extends GeneralEntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;
export declare type DeduceCreateMultipleOperation<SH extends GeneralEntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;
export declare type DeduceCreateOperation<SH extends GeneralEntityShape> = DeduceCreateSingleOperation<SH> | DeduceCreateMultipleOperation<SH>;
export declare type DeduceUpdateOperationData<SH extends GeneralEntityShape> = FormUpdateData<SH>;
export declare type DeduceUpdateOperation<SH extends GeneralEntityShape> = Operation<'update' | string, DeduceUpdateOperationData<SH>, DeduceFilter<SH>>;
export declare type DeduceRemoveOperationData<SH extends GeneralEntityShape> = {
    [A in keyof SH]?: any;
} & {
    [A: string]: any;
};
export declare type DeduceRemoveOperation<SH extends GeneralEntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<SH>>;
export declare type DeduceOperation<SH extends GeneralEntityShape> = DeduceCreateOperation<SH> | DeduceUpdateOperation<SH> | DeduceRemoveOperation<SH> | DeduceSelection<SH>;
export declare type CreateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'c';
    e: T;
    d: ED[T]['OpSchema'];
};
export declare type UpdateOpResult<ED extends EntityDict, T extends keyof ED> = {
    a: 'u';
    e: T;
    d: FormUpdateData<ED[T]['OpSchema']>;
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
export interface OperationResult {
    ids?: string[];
}
export declare type SelectRowShape<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    [K in keyof P]: K extends ExpressionKey ? any : K extends keyof E ? P[K] extends 1 ? E[K] : E[K] extends Array<any> ? Array<SelectRowShape<E[K][0], P[K]['data']>> : SelectRowShape<E[K], P[K]> : any;
};
export declare type SelectionResult2<E extends GeneralEntityShape, P extends DeduceProjection<GeneralEntityShape>> = {
    result: Array<SelectRowShape<E, P>>;
};
export {};
