import { String, ForeignKey, JsonProjection } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey, JsonFilter } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, EntityShape, AggregationResult } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Relation from "../Relation/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
declare type Actions = string[];
export declare type OpSchema = EntityShape & {
    relationId: ForeignKey<"relation">;
    path: String<256>;
    destEntity: String<32>;
    deActions: Actions;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
    relationId: ForeignKey<"relation">;
    path: String<256>;
    destEntity: String<32>;
    deActions: Actions;
    relation: Relation.Schema;
    modiEntity$entity?: Array<ModiEntity.Schema>;
    modiEntity$entity$$aggr?: AggregationResult<ModiEntity.Schema>;
    operEntity$entity?: Array<OperEntity.Schema>;
    operEntity$entity$$aggr?: AggregationResult<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.ActionAuthIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    relationId: Q_StringValue | SubQuery.RelationIdSubQuery;
    relation: Relation.Filter;
    path: Q_StringValue;
    destEntity: Q_StringValue;
    deActions: JsonFilter<Actions>;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: number;
    $$createAt$$?: number;
    $$updateAt$$?: number;
    $$seq$$?: number;
    relationId?: number;
    relation?: Relation.Projection;
    path?: number;
    destEntity?: number;
    deActions?: number | JsonProjection<Actions>;
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
declare type ActionAuthIdProjection = OneOf<{
    id: number;
}>;
declare type RelationIdProjection = OneOf<{
    relationId: number;
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
    relationId: number;
} | {
    relation: Relation.SortAttr;
} | {
    path: number;
} | {
    destEntity: number;
} | {
    deActions: number;
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
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "relationId">> & (({
    relationId?: never;
    relation: Relation.CreateSingleOperation;
} | {
    relationId: String<64>;
    relation?: Relation.UpdateOperation;
} | {
    relationId: String<64>;
})) & {
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "relationId">> & (({
    relation: Relation.CreateSingleOperation;
    relationId?: never;
} | {
    relation: Relation.UpdateOperation;
    relationId?: never;
} | {
    relation: Relation.RemoveOperation;
    relationId?: never;
} | {
    relation?: never;
    relationId?: String<64> | null;
})) & {
    [k: string]: any;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & (({
    relation?: Relation.UpdateOperation | Relation.RemoveOperation;
}));
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export declare type RelationIdSubQuery = Selection<RelationIdProjection>;
export declare type ActionAuthIdSubQuery = Selection<ActionAuthIdProjection>;
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
