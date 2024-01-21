import { ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_NumberValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey, SubQueryPredicateMetadata } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, AggregationResult } from "../../types/Entity";
import { Action, ParticularAction, UserState } from "./Action";
import { RelationAction } from "../../actions/action";
import { String, Text } from "../../types/DataType";
import { EntityShape } from "../../types/Entity";
import * as Oper from "../Oper/Schema";
import * as UserEntityClaim from "../UserEntityClaim/Schema";
import * as UserRelation from "../UserRelation/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
export type OpSchema = EntityShape & {
    name?: String<16> | null;
    nickname?: String<64> | null;
    password?: Text | null;
    refId?: ForeignKey<"user"> | null;
    userState?: UserState | null;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
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
    userEntityClaim$user?: Array<UserEntityClaim.Schema>;
    userEntityClaim$user$$aggr?: AggregationResult<UserEntityClaim.Schema>;
    userRelation$user?: Array<UserRelation.Schema>;
    userRelation$user$$aggr?: AggregationResult<UserRelation.Schema>;
    modiEntity$entity?: Array<ModiEntity.Schema>;
    modiEntity$entity$$aggr?: AggregationResult<ModiEntity.Schema>;
    operEntity$entity?: Array<OperEntity.Schema>;
    operEntity$entity$$aggr?: AggregationResult<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
type AttrFilter = {
    id: Q_StringValue;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_NumberValue;
    $$updateAt$$: Q_DateValue;
    name: Q_StringValue;
    nickname: Q_StringValue;
    password: Q_StringValue;
    refId: Q_StringValue;
    ref: Filter;
    userState: Q_EnumValue<UserState>;
    oper$operator: Oper.Filter & SubQueryPredicateMetadata;
    user$ref: Filter & SubQueryPredicateMetadata;
    userEntityClaim$user: UserEntityClaim.Filter & SubQueryPredicateMetadata;
    userRelation$user: UserRelation.Filter & SubQueryPredicateMetadata;
    modiEntity$entity: ModiEntity.Filter & SubQueryPredicateMetadata;
    operEntity$entity: OperEntity.Filter & SubQueryPredicateMetadata;
};
export type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export type Projection = {
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
    userEntityClaim$user?: UserEntityClaim.Selection & {
        $entity: "userEntityClaim";
    };
    userEntityClaim$user$$aggr?: UserEntityClaim.Aggregation & {
        $entity: "userEntityClaim";
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
type UserIdProjection = OneOf<{
    id: number;
    refId: number;
}>;
export type SortAttr = {
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
export type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export type Sorter = SortNode[];
export type SelectOperation<P extends Object = Projection> = OakSelection<"select", P, Filter, Sorter>;
export type Selection<P extends Object = Projection> = SelectOperation<P>;
export type Aggregation = DeduceAggregation<Projection, Filter, Sorter>;
export type CreateOperationData = FormCreateData<Omit<OpSchema, "refId">> & (({
    refId?: never;
    ref?: CreateSingleOperation;
} | {
    refId: ForeignKey<"ref">;
    ref?: UpdateOperation;
} | {
    ref?: never;
    refId?: ForeignKey<"ref">;
})) & {
    oper$operator?: OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">[]> | Array<OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">>>;
    user$ref?: OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">[]> | Array<OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">> | OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">>>;
    userEntityClaim$user?: OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "user" | "userId">, Omit<UserEntityClaim.Filter, "user" | "userId">> | OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "user" | "userId">[]> | Array<OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "user" | "userId">> | OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "user" | "userId">, Omit<UserEntityClaim.Filter, "user" | "userId">>>;
    userRelation$user?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<Omit<OpSchema, "refId">> & (({
    ref?: CreateSingleOperation;
    refId?: never;
} | {
    ref?: UpdateOperation;
    refId?: never;
} | {
    ref?: RemoveOperation;
    refId?: never;
} | {
    ref?: never;
    refId?: ForeignKey<"ref"> | null;
})) & {
    [k: string]: any;
    oper$operator?: OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">[]> | Array<OakOperation<"create", Omit<Oper.CreateOperationData, "operator" | "operatorId">>>;
    user$ref?: OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<RemoveOperation["action"], Omit<RemoveOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">[]> | Array<OakOperation<"create", Omit<CreateOperationData, "ref" | "refId">> | OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">> | OakOperation<RemoveOperation["action"], Omit<RemoveOperationData, "ref" | "refId">, Omit<Filter, "ref" | "refId">>>;
    userEntityClaim$user?: OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "user" | "userId">, Omit<UserEntityClaim.Filter, "user" | "userId">> | OakOperation<UserEntityClaim.RemoveOperation["action"], Omit<UserEntityClaim.RemoveOperationData, "user" | "userId">, Omit<UserEntityClaim.Filter, "user" | "userId">> | OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "user" | "userId">[]> | Array<OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "user" | "userId">> | OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "user" | "userId">, Omit<UserEntityClaim.Filter, "user" | "userId">> | OakOperation<UserEntityClaim.RemoveOperation["action"], Omit<UserEntityClaim.RemoveOperationData, "user" | "userId">, Omit<UserEntityClaim.Filter, "user" | "userId">>>;
    userRelation$user?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<UserRelation.RemoveOperation["action"], Omit<UserRelation.RemoveOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "user" | "userId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">> | OakOperation<UserRelation.RemoveOperation["action"], Omit<UserRelation.RemoveOperationData, "user" | "userId">, Omit<UserRelation.Filter, "user" | "userId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type UpdateOperation = OakOperation<"update" | ParticularAction | RelationAction | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {} & (({
    ref?: UpdateOperation | RemoveOperation;
}));
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type UserIdSubQuery = Selection<UserIdProjection>;
export type EntityDef = {
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
