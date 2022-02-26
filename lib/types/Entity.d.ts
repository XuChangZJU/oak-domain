import { GenericAction } from '../actions/action';
import { ExpressionKey, MakeFilter, NodeId, Q_BooleanValue, Q_NumberValue, Q_StringValue } from './Demand';
export declare type Filter<A extends string, F extends Object | undefined = undefined> = {
    filter?: A extends 'create' ? undefined : F;
    indexFrom?: A extends 'create' ? undefined : number;
    count?: A extends 'create' ? undefined : number;
};
declare type SelectOption = {
    forUpdate?: true;
    usingIndex?: 'todo';
};
export declare type FormUpdateData<SH extends EntityShape> = {
    [A in keyof SH]?: SH[A] | null | object;
} & {
    id?: undefined;
} & {
    [A: string]: any;
};
export declare type FormCreateData<SH extends EntityShape> = {
    [A in keyof SH]?: SH[A] | undefined | object;
} & {
    id: string;
} & {
    [A: string]: any;
};
export declare type Operation<A extends GenericAction | string, DATA extends Object, FILTER extends Object | undefined = undefined, SORTER extends Object | undefined = undefined> = {
    action: A;
    data: DATA;
    sorter?: SORTER;
    option?: A extends 'select' ? SelectOption : undefined;
} & Filter<A, FILTER>;
export declare type Selection<DATA extends Object, FILTER extends Object | undefined = undefined, SORT extends Object | undefined = undefined> = Operation<'select', DATA, FILTER, SORT>;
export interface EntityShape {
    id?: string;
    $$createAt$$?: number | Date;
    $$updateAt$$?: number | Date;
    $$removeAt$$?: number | Date;
}
export interface EntityDef<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> {
    Schema: SH;
    OpSchema: Partial<SH>;
    Action: string;
    ParticularAction?: string;
    Selection: Omit<DeduceSelection<E, ED, T, SH>, 'action'>;
    Operation: DeduceOperation<E, ED, T, SH>;
}
declare type DeduceProjection<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = {
    '#id'?: NodeId;
} & {
    [K in keyof ED[T]['OpSchema']]?: 1;
} & {
    [F: string]: 1 | object | NodeId | undefined;
};
declare type FilterNode<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = {
    '#id'?: NodeId;
} & {
    [K: string]: Q_NumberValue | Q_StringValue | Q_BooleanValue | object;
};
export declare type DeduceFilter<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = MakeFilter<FilterNode<E, ED, T, SH>>;
export declare type DeduceSorterAttr<SH extends EntityShape = EntityShape> = any;
export declare type DeduceSorter<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Array<{
    $attr: DeduceSorterAttr<SH>;
    $direction?: "asc" | "desc";
}>;
export declare type DeduceSelection<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Selection<DeduceProjection<E, ED, T, SH>, DeduceFilter<E, ED, T, SH>, DeduceSorter<E, ED, T, SH>>;
export declare type DeduceCreateOperationData<SH extends EntityShape = EntityShape> = FormCreateData<SH>;
export declare type DeduceCreateSingleOperation<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Operation<'create', DeduceCreateOperationData<SH>>;
export declare type DeduceCreateMultipleOperation<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Operation<'create', Array<DeduceCreateOperationData<SH>>>;
export declare type DeduceCreateOperation<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = DeduceCreateSingleOperation<E, ED, T, SH> | DeduceCreateMultipleOperation<E, ED, T, SH>;
export declare type DeduceUpdateOperationData<SH extends EntityShape = EntityShape> = FormUpdateData<SH>;
export declare type DeduceUpdateOperation<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Operation<'update' | string, DeduceUpdateOperationData<SH>, DeduceFilter<E, ED, T, SH>>;
export declare type DeduceRemoveOperationData<SH extends EntityShape = EntityShape> = {
    [A in keyof SH]?: Object;
} & {
    [A: string]: any;
};
export declare type DeduceRemoveOperation<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Operation<'remove', DeduceRemoveOperationData<SH>, DeduceFilter<E, ED, T, SH>>;
export declare type DeduceOperation<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = DeduceCreateOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH> | DeduceSelection<E, ED, T, SH>;
export interface OperationResult<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends EntityShape = EntityShape> {
    operations?: {
        [T in E]: Array<EntityDef<E, ED, T, SH>['Operation']>;
    };
    ids?: string[];
    stats?: 'todo';
    errors?: Array<{
        code?: number;
        message: string;
    }>;
}
export declare type SelectionResult<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends EntityShape = EntityShape> = Array<Partial<ED[T]['Schema'] & {
    [A in ExpressionKey]?: any;
}>>;
export {};
