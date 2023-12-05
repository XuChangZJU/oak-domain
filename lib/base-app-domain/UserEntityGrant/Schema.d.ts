import { JsonProjection } from "../../types/DataType";
import { Q_DateValue, Q_NumberValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey, JsonFilter, SubQueryPredicateMetadata } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, AggregationResult } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import { String } from "../../types/DataType";
import { EntityShape } from "../../types/Entity";
import * as UserEntityClaim from "../UserEntityClaim/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
type RelationIds = string[];
export type OpSchema = EntityShape & {
    relationEntity: String<32>;
    relationEntityFilter: Object;
    relationIds: RelationIds;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    relationEntity: String<32>;
    relationEntityFilter: Object;
    relationIds: RelationIds;
    userEntityClaim$ueg?: Array<UserEntityClaim.Schema>;
    userEntityClaim$ueg$$aggr?: AggregationResult<UserEntityClaim.Schema>;
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
    relationEntity: Q_StringValue;
    relationEntityFilter: Object;
    relationIds: JsonFilter<RelationIds>;
    userEntityClaim$ueg: UserEntityClaim.Filter & SubQueryPredicateMetadata;
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
    relationEntity?: number;
    relationEntityFilter?: number | Object;
    relationIds?: number | JsonProjection<RelationIds>;
    userEntityClaim$ueg?: UserEntityClaim.Selection & {
        $entity: "userEntityClaim";
    };
    userEntityClaim$ueg$$aggr?: UserEntityClaim.Aggregation & {
        $entity: "userEntityClaim";
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
type UserEntityGrantIdProjection = OneOf<{
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
    relationEntity: number;
} | {
    relationIds: number;
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
export type CreateOperationData = FormCreateData<OpSchema> & {
    userEntityClaim$ueg?: OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "ueg" | "uegId">, Omit<UserEntityClaim.Filter, "ueg" | "uegId">> | OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "ueg" | "uegId">[]> | Array<OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "ueg" | "uegId">> | OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "ueg" | "uegId">, Omit<UserEntityClaim.Filter, "ueg" | "uegId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<OpSchema> & {
    [k: string]: any;
    userEntityClaim$ueg?: OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "ueg" | "uegId">, Omit<UserEntityClaim.Filter, "ueg" | "uegId">> | OakOperation<UserEntityClaim.RemoveOperation["action"], Omit<UserEntityClaim.RemoveOperationData, "ueg" | "uegId">, Omit<UserEntityClaim.Filter, "ueg" | "uegId">> | OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "ueg" | "uegId">[]> | Array<OakOperation<"create", Omit<UserEntityClaim.CreateOperationData, "ueg" | "uegId">> | OakOperation<UserEntityClaim.UpdateOperation["action"], Omit<UserEntityClaim.UpdateOperationData, "ueg" | "uegId">, Omit<UserEntityClaim.Filter, "ueg" | "uegId">> | OakOperation<UserEntityClaim.RemoveOperation["action"], Omit<UserEntityClaim.RemoveOperationData, "ueg" | "uegId">, Omit<UserEntityClaim.Filter, "ueg" | "uegId">>>;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {};
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type UserEntityGrantIdSubQuery = Selection<UserEntityGrantIdProjection>;
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
