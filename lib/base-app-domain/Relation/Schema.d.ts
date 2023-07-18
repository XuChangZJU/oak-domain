import { String } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, EntityShape, AggregationResult } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as ActionAuth from "../ActionAuth/Schema";
import * as RelationAuth from "../RelationAuth/Schema";
import * as UserEntityGrant from "../UserEntityGrant/Schema";
import * as UserRelation from "../UserRelation/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
export declare type OpSchema = EntityShape & {
    entity: String<32>;
    entityId?: String<64> | null;
    name?: String<32> | null;
    display?: String<32> | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
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
    userEntityGrant$relation?: Array<UserEntityGrant.Schema>;
    userEntityGrant$relation$$aggr?: AggregationResult<UserEntityGrant.Schema>;
    userRelation$relation?: Array<UserRelation.Schema>;
    userRelation$relation$$aggr?: AggregationResult<UserRelation.Schema>;
    modiEntity$entity?: Array<ModiEntity.Schema>;
    modiEntity$entity$$aggr?: AggregationResult<ModiEntity.Schema>;
    operEntity$entity?: Array<OperEntity.Schema>;
    operEntity$entity$$aggr?: AggregationResult<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.RelationIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    entity: Q_StringValue;
    entityId: Q_StringValue;
    name: Q_StringValue;
    display: Q_StringValue;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export declare type Projection = {
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
    userEntityGrant$relation?: UserEntityGrant.Selection & {
        $entity: "userEntityGrant";
    };
    userEntityGrant$relation$$aggr?: UserEntityGrant.Aggregation & {
        $entity: "userEntityGrant";
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
declare type RelationIdProjection = OneOf<{
    id: number;
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
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P extends Object = Projection> = OakSelection<"select", P, Filter, Sorter>;
export declare type Selection<P extends Object = Projection> = SelectOperation<P>;
export declare type Aggregation = DeduceAggregation<Projection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId">> & ({
    entity?: string;
    entityId?: string;
    [K: string]: any;
}) & {
    actionAuth$relation?: OakOperation<ActionAuth.UpdateOperation["action"], Omit<ActionAuth.UpdateOperationData, "relation" | "relationId">, ActionAuth.Filter> | OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">> | OakOperation<ActionAuth.UpdateOperation["action"], Omit<ActionAuth.UpdateOperationData, "relation" | "relationId">, ActionAuth.Filter>>;
    relationAuth$sourceRelation?: OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "sourceRelation" | "sourceRelationId">, RelationAuth.Filter> | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">> | OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "sourceRelation" | "sourceRelationId">, RelationAuth.Filter>>;
    relationAuth$destRelation?: OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "destRelation" | "destRelationId">, RelationAuth.Filter> | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">> | OakOperation<RelationAuth.UpdateOperation["action"], Omit<RelationAuth.UpdateOperationData, "destRelation" | "destRelationId">, RelationAuth.Filter>>;
    userEntityGrant$relation?: OakOperation<UserEntityGrant.UpdateOperation["action"], Omit<UserEntityGrant.UpdateOperationData, "relation" | "relationId">, UserEntityGrant.Filter> | OakOperation<"create", Omit<UserEntityGrant.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserEntityGrant.CreateOperationData, "relation" | "relationId">> | OakOperation<UserEntityGrant.UpdateOperation["action"], Omit<UserEntityGrant.UpdateOperationData, "relation" | "relationId">, UserEntityGrant.Filter>>;
    userRelation$relation?: OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "relation" | "relationId">, UserRelation.Filter> | OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">> | OakOperation<UserRelation.UpdateOperation["action"], Omit<UserRelation.UpdateOperationData, "relation" | "relationId">, UserRelation.Filter>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<OpSchema> & {
    [k: string]: any;
    actionAuth$relation?: ActionAuth.UpdateOperation | ActionAuth.RemoveOperation | OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<ActionAuth.CreateOperationData, "relation" | "relationId">> | ActionAuth.UpdateOperation | ActionAuth.RemoveOperation>;
    relationAuth$sourceRelation?: RelationAuth.UpdateOperation | RelationAuth.RemoveOperation | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "sourceRelation" | "sourceRelationId">> | RelationAuth.UpdateOperation | RelationAuth.RemoveOperation>;
    relationAuth$destRelation?: RelationAuth.UpdateOperation | RelationAuth.RemoveOperation | OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">[]> | Array<OakOperation<"create", Omit<RelationAuth.CreateOperationData, "destRelation" | "destRelationId">> | RelationAuth.UpdateOperation | RelationAuth.RemoveOperation>;
    userEntityGrant$relation?: UserEntityGrant.UpdateOperation | UserEntityGrant.RemoveOperation | OakOperation<"create", Omit<UserEntityGrant.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserEntityGrant.CreateOperationData, "relation" | "relationId">> | UserEntityGrant.UpdateOperation | UserEntityGrant.RemoveOperation>;
    userRelation$relation?: UserRelation.UpdateOperation | UserRelation.RemoveOperation | OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">[]> | Array<OakOperation<"create", Omit<UserRelation.CreateOperationData, "relation" | "relationId">> | UserRelation.UpdateOperation | UserRelation.RemoveOperation>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export declare type RelationIdSubQuery = Selection<RelationIdProjection>;
export declare type EntityDef = {
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
