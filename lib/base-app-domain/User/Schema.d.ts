import { String, Text, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey, SubQueryPredicateMetadata } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, EntityShape, AggregationResult } from "../../types/Entity";
import { Action, ParticularAction, UserState } from "./Action";
import { RelationAction } from "../../actions/action";
import * as Oper from "../Oper/Schema";
import * as UserRelation from "../UserRelation/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
export declare type OpSchema = EntityShape & {
    name?: String<16> | null;
    nickname?: String<64> | null;
    password?: Text | null;
    refId?: ForeignKey<"user"> | null;
    userState?: UserState | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
    name?: String<16> | null;
    nickname?: String<64> | null;
    password?: Text | null;
    refId?: ForeignKey<"user"> | null;
    userState?: UserState | null;
    ref?: Schema | null;
    oper$operator?: Array<Oper.Schema>;
    oper$operator$$aggr?: AggregationResult<Oper.Schema>;
    user$ref?: Array<Schema>;
    user$ref$$aggr?: AggregationResult<Schema>;
    userRelation$user?: Array<UserRelation.Schema>;
    userRelation$user$$aggr?: AggregationResult<UserRelation.Schema>;
    modiEntity$entity?: Array<ModiEntity.Schema>;
    modiEntity$entity$$aggr?: AggregationResult<ModiEntity.Schema>;
    operEntity$entity?: Array<OperEntity.Schema>;
    operEntity$entity$$aggr?: AggregationResult<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    name: Q_StringValue;
    nickname: Q_StringValue;
    password: Q_StringValue;
    refId: Q_StringValue;
    ref: Filter;
    userState: Q_EnumValue<UserState>;
    oper$operator: Oper.Filter & SubQueryPredicateMetadata;
    user$ref: Filter & SubQueryPredicateMetadata;
    userRelation$user: UserRelation.Filter & SubQueryPredicateMetadata;
    modiEntity$entity: ModiEntity.Filter & SubQueryPredicateMetadata;
    operEntity$entity: OperEntity.Filter & SubQueryPredicateMetadata;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: number;
    $$createAt$$?: number;
    $$updateAt$$?: number;
    $$seq$$?: number;
    name?: number;
    nickname?: number;
    password?: number;
    refId?: number;
    ref?: Projection;
    userState?: number;
    oper$operator?: Oper.Selection & {
        $entity: "oper";
    };
    oper$operator$$aggr?: Oper.Aggregation & {
        $entity: "oper";
    };
    user$ref?: Selection & {
        $entity: "user";
    };
    user$ref$$aggr?: Aggregation & {
        $entity: "user";
    };
    userRelation$user?: UserRelation.Selection & {
        $entity: "userRelation";
    };
    userRelation$user$$aggr?: UserRelation.Aggregation & {
        $entity: "userRelation";
    };
    modiEntity$entity?: ModiEntity.Selection & {
        $entity: "modiEntity";
    };
    modiEntity$entity$$aggr?: ModiEntity.Aggregation & {
        $entity: "modiEntity";
    };
    operEntity$entity?: OperEntity.Selection & {
        $entity: "operEntity";
    };
    operEntity$entity$$aggr?: OperEntity.Aggregation & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr | string>>;
declare type UserIdProjection = OneOf<{
    id: number;
    refId: number;
}>;
export declare type SortAttr = {
    id: number;
} | {
    $$createAt$$: number;
} | {
    $$seq$$: number;
} | {
    $$updateAt$$: number;
} | {
    name: number;
} | {
    nickname: number;
} | {
    password: number;
} | {
    refId: number;
} | {
    ref: SortAttr;
} | {
    userState: number;
} | {
    [k: string]: any;
} | OneOf<ExprOp<OpAttr | string>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P extends Object = Projection> = OakSelection<"select", P, Filter, Sorter>;
export declare type Selection<P extends Object = Projection> = SelectOperation<P>;
export declare type Aggregation = DeduceAggregation<Projection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "refId">> & (({
    refId?: never;
    ref?: CreateSingleOperation;
} | {
    refId: String<64>;
    ref?: UpdateOperation;
} | {
    refId?: String<64>;
})) & {
    oper$operator?: OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">[]> | Array<OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">>>;
    user$ref?: OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">[]> | Array<OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">> | OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">>>;
    userRelation$user?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "refId">> & (({
    ref: CreateSingleOperation;
    refId?: never;
} | {
    ref: UpdateOperation;
    refId?: never;
} | {
    ref: RemoveOperation;
    refId?: never;
} | {
    ref?: never;
    refId?: String<64> | null;
})) & {
    [k: string]: any;
    oper$operator?: OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">[]> | Array<OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">>>;
    user$ref?: OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<RemoveOperation["action"], Omit<RemoveOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">[]> | Array<OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">> | OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<RemoveOperation["action"], Omit<RemoveOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">>>;
    userRelation$user?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<UserRelation.RemoveOperation["action"], Omit<UserRelation.RemoveOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<UserRelation.RemoveOperation["action"], Omit<UserRelation.RemoveOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export declare type UpdateOperation = OakOperation<"update" | ParticularAction | RelationAction | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & (({
    ref?: UpdateOperation | RemoveOperation;
}));
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: OakMakeAction<Action | RelationAction> | string;
    Selection: Selection;
    Aggregation: Aggregation;
    Operation: Operation;
    Create: CreateOperation;
    Update: UpdateOperation;
    Remove: RemoveOperation;
    CreateSingle: CreateSingleOperation;
    CreateMulti: CreateMultipleOperation;
    ParticularAction: ParticularAction;
};
export {};
