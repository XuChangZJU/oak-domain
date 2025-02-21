import { Q_DateValue, Q_NumberValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey, SubQueryPredicateMetadata } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, AggregationResult, EntityShape } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import { String } from "../../types/DataType";
import * as ActionAuth from "../ActionAuth/Schema";
import * as RelationAuth from "../RelationAuth/Schema";
import * as UserEntityClaim from "../UserEntityClaim/Schema";
import * as UserRelation from "../UserRelation/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
export type OpSchema = EntityShape & {
    entity: String<32>;
    entityId?: String<64> | null;
    name?: String<32> | null;
    display?: String<32> | null;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    entity: String<32>;
    entityId?: String<64> | null;
    name?: String<32> | null;
    display?: String<32> | null;
    actionAuth$relation?: Array<ActionAuth.Schema>;
    actionAuth$relation$$aggr?: AggregationResult<ActionAuth.Schema>;
    relationAuth$sourceRelation?: Array<RelationAuth.Schema>;
    relationAuth$sourceRelation$$aggr?: AggregationResult<RelationAuth.Schema>;
    relationAuth$destRelation?: Array<RelationAuth.Schema>;
    relationAuth$destRelation$$aggr?: AggregationResult<RelationAuth.Schema>;
    userEntityClaim$relation?: Array<UserEntityClaim.Schema>;
    userEntityClaim$relation$$aggr?: AggregationResult<UserEntityClaim.Schema>;
    userRelation$relation?: Array<UserRelation.Schema>;
    userRelation$relation$$aggr?: AggregationResult<UserRelation.Schema>;
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
    entity: Q_StringValue;
    entityId: Q_StringValue;
    name: Q_StringValue;
    display: Q_StringValue;
    actionAuth$relation: ActionAuth.Filter & SubQueryPredicateMetadata;
    relationAuth$sourceRelation: RelationAuth.Filter & SubQueryPredicateMetadata;
    relationAuth$destRelation: RelationAuth.Filter & SubQueryPredicateMetadata;
    userEntityClaim$relation: UserEntityClaim.Filter & SubQueryPredicateMetadata;
    userRelation$relation: UserRelation.Filter & SubQueryPredicateMetadata;
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
    entity?: number;
    entityId?: number;
    name?: number;
    display?: number;
    actionAuth$relation?: ActionAuth.Selection & {
        $entity: "actionAuth";
    };
    actionAuth$relation$$aggr?: ActionAuth.Aggregation & {
        $entity: "actionAuth";
    };
    relationAuth$sourceRelation?: RelationAuth.Selection & {
        $entity: "relationAuth";
    };
    relationAuth$sourceRelation$$aggr?: RelationAuth.Aggregation & {
        $entity: "relationAuth";
    };
    relationAuth$destRelation?: RelationAuth.Selection & {
        $entity: "relationAuth";
    };
    relationAuth$destRelation$$aggr?: RelationAuth.Aggregation & {
        $entity: "relationAuth";
    };
    userEntityClaim$relation?: UserEntityClaim.Selection & {
        $entity: "userEntityClaim";
    };
    userEntityClaim$relation$$aggr?: UserEntityClaim.Aggregation & {
        $entity: "userEntityClaim";
    };
    userRelation$relation?: UserRelation.Selection & {
        $entity: "userRelation";
    };
    userRelation$relation$$aggr?: UserRelation.Aggregation & {
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
type RelationIdProjection = OneOf<{
    id: number;
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
    entity: number;
} | {
    entityId: number;
} | {
    name: number;
} | {
    display: number;
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
export type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId">> & ({
    entity?: string;
    entityId?: string;
    [K: string]: any;
}) & {
    actionAuth$relation?: OakOperation<ActionAuth.UpdateOperation["action"], Omit<ActionAuth.UpdateOperationData, "relation" | "relationId">, Omit<ActionAuth.Filter, "relation" | "relationId">> | OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">> | OakOperation<ActionAuth.UpdateOperation["action"], Omit<ActionAuth.UpdateOperationData, "relation" | "relationId">, Omit<ActionAuth.Filter, "relation" | "relationId">>>;
    relationAuth$sourceRelation?: OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "sourceRelation" | "sourceRelationId">, Omit<RelationAuth.Filter, "sourceRelation" | "sourceRelationId">> | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">> | OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "sourceRelation" | "sourceRelationId">, Omit<RelationAuth.Filter, "sourceRelation" | "sourceRelationId">>>;
    relationAuth$destRelation?: OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "destRelation" | "destRelationId">, Omit<RelationAuth.Filter, "destRelation" | "destRelationId">> | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">> | OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "destRelation" | "destRelationId">, Omit<RelationAuth.Filter, "destRelation" | "destRelationId">>>;
    userEntityClaim$relation?: OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "relation" | "relationId">, Omit<UserEntityClaim.Filter, "relation" | "relationId">> | OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "relation" | "relationId">> | OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "relation" | "relationId">, Omit<UserEntityClaim.Filter, "relation" | "relationId">>>;
    userRelation$relation?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "relation" | "relationId">, Omit<UserRelation.Filter, "relation" | "relationId">> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "relation" | "relationId">, Omit<UserRelation.Filter, "relation" | "relationId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<OpSchema> & {
    [k: string]: any;
    actionAuth$relation?: OakOperation<ActionAuth.UpdateOperation["action"], Omit<ActionAuth.UpdateOperationData, "relation" | "relationId">, Omit<ActionAuth.Filter, "relation" | "relationId">> | OakOperation<ActionAuth.RemoveOperation["action"], Omit<ActionAuth.RemoveOperationData, "relation" | "relationId">, Omit<ActionAuth.Filter, "relation" | "relationId">> | OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">> | OakOperation<ActionAuth.UpdateOperation["action"], Omit<ActionAuth.UpdateOperationData, "relation" | "relationId">, Omit<ActionAuth.Filter, "relation" | "relationId">> | OakOperation<ActionAuth.RemoveOperation["action"], Omit<ActionAuth.RemoveOperationData, "relation" | "relationId">, Omit<ActionAuth.Filter, "relation" | "relationId">>>;
    relationAuth$sourceRelation?: OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "sourceRelation" | "sourceRelationId">, Omit<RelationAuth.Filter, "sourceRelation" | "sourceRelationId">> | OakOperation<RelationAuth.RemoveOperation["action"], Omit<RelationAuth.RemoveOperationData, "sourceRelation" | "sourceRelationId">, Omit<RelationAuth.Filter, "sourceRelation" | "sourceRelationId">> | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">> | OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "sourceRelation" | "sourceRelationId">, Omit<RelationAuth.Filter, "sourceRelation" | "sourceRelationId">> | OakOperation<RelationAuth.RemoveOperation["action"], Omit<RelationAuth.RemoveOperationData, "sourceRelation" | "sourceRelationId">, Omit<RelationAuth.Filter, "sourceRelation" | "sourceRelationId">>>;
    relationAuth$destRelation?: OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "destRelation" | "destRelationId">, Omit<RelationAuth.Filter, "destRelation" | "destRelationId">> | OakOperation<RelationAuth.RemoveOperation["action"], Omit<RelationAuth.RemoveOperationData, "destRelation" | "destRelationId">, Omit<RelationAuth.Filter, "destRelation" | "destRelationId">> | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">> | OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "destRelation" | "destRelationId">, Omit<RelationAuth.Filter, "destRelation" | "destRelationId">> | OakOperation<RelationAuth.RemoveOperation["action"], Omit<RelationAuth.RemoveOperationData, "destRelation" | "destRelationId">, Omit<RelationAuth.Filter, "destRelation" | "destRelationId">>>;
    userEntityClaim$relation?: OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "relation" | "relationId">, Omit<UserEntityClaim.Filter, "relation" | "relationId">> | OakOperation<UserEntityClaim.RemoveOperation["action"], Omit<UserEntityClaim.RemoveOperationData, "relation" | "relationId">, Omit<UserEntityClaim.Filter, "relation" | "relationId">> | OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "relation" | "relationId">> | OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "relation" | "relationId">, Omit<UserEntityClaim.Filter, "relation" | "relationId">> | OakOperation<UserEntityClaim.RemoveOperation["action"], Omit<UserEntityClaim.RemoveOperationData, "relation" | "relationId">, Omit<UserEntityClaim.Filter, "relation" | "relationId">>>;
    userRelation$relation?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "relation" | "relationId">, Omit<UserRelation.Filter, "relation" | "relationId">> | OakOperation<UserRelation.RemoveOperation["action"], Omit<UserRelation.RemoveOperationData, "relation" | "relationId">, Omit<UserRelation.Filter, "relation" | "relationId">> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "relation" | "relationId">, Omit<UserRelation.Filter, "relation" | "relationId">> | OakOperation<UserRelation.RemoveOperation["action"], Omit<UserRelation.RemoveOperationData, "relation" | "relationId">, Omit<UserRelation.Filter, "relation" | "relationId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {};
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type RelationIdSubQuery = Selection<RelationIdProjection>;
export type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: OakMakeAction<GenericAction> | string;
    Selection: Selection;
    Aggregation: Aggregation;
    Operation: Operation;
    Create: CreateOperation;
    Update: UpdateOperation;
    Remove: RemoveOperation;
    CreateSingle: CreateSingleOperation;
    CreateMulti: CreateMultipleOperation;
};
export {};
