import { ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_NumberValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey, SubQueryPredicateMetadata } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, AggregationResult, EntityShape } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Relation from "../Relation/Schema";
import * as Path from "../Path/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
export type OpSchema = EntityShape & {
    sourceRelationId: ForeignKey<"relation">;
    pathId: ForeignKey<"path">;
    destRelationId: ForeignKey<"relation">;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    sourceRelationId: ForeignKey<"relation">;
    pathId: ForeignKey<"path">;
    destRelationId: ForeignKey<"relation">;
    sourceRelation: Relation.Schema;
    path: Path.Schema;
    destRelation: Relation.Schema;
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
    sourceRelationId: Q_StringValue;
    sourceRelation: Relation.Filter;
    pathId: Q_StringValue;
    path: Path.Filter;
    destRelationId: Q_StringValue;
    destRelation: Relation.Filter;
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
    sourceRelationId?: number;
    sourceRelation?: Relation.Projection;
    pathId?: number;
    path?: Path.Projection;
    destRelationId?: number;
    destRelation?: Relation.Projection;
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
type RelationAuthIdProjection = OneOf<{
    id: number;
}>;
type RelationIdProjection = OneOf<{
    sourceRelationId: number;
    destRelationId: number;
}>;
type PathIdProjection = OneOf<{
    pathId: number;
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
    sourceRelationId: number;
} | {
    sourceRelation: Relation.SortAttr;
} | {
    pathId: number;
} | {
    path: Path.SortAttr;
} | {
    destRelationId: number;
} | {
    destRelation: Relation.SortAttr;
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
export type CreateOperationData = FormCreateData<Omit<OpSchema, "sourceRelationId" | "pathId" | "destRelationId">> & (({
    sourceRelationId?: never;
    sourceRelation: Relation.CreateSingleOperation;
} | {
    sourceRelationId: ForeignKey<"sourceRelation">;
    sourceRelation?: Relation.UpdateOperation;
} | {
    sourceRelation?: never;
    sourceRelationId: ForeignKey<"sourceRelation">;
}) & ({
    pathId?: never;
    path: Path.CreateSingleOperation;
} | {
    pathId: ForeignKey<"path">;
    path?: Path.UpdateOperation;
} | {
    path?: never;
    pathId: ForeignKey<"path">;
}) & ({
    destRelationId?: never;
    destRelation: Relation.CreateSingleOperation;
} | {
    destRelationId: ForeignKey<"destRelation">;
    destRelation?: Relation.UpdateOperation;
} | {
    destRelation?: never;
    destRelationId: ForeignKey<"destRelation">;
})) & {
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<Omit<OpSchema, "sourceRelationId" | "pathId" | "destRelationId">> & (({
    sourceRelation?: Relation.CreateSingleOperation;
    sourceRelationId?: never;
} | {
    sourceRelation?: Relation.UpdateOperation;
    sourceRelationId?: never;
} | {
    sourceRelation?: Relation.RemoveOperation;
    sourceRelationId?: never;
} | {
    sourceRelation?: never;
    sourceRelationId?: ForeignKey<"sourceRelation">;
}) & ({
    path?: Path.CreateSingleOperation;
    pathId?: never;
} | {
    path?: Path.UpdateOperation;
    pathId?: never;
} | {
    path?: Path.RemoveOperation;
    pathId?: never;
} | {
    path?: never;
    pathId?: ForeignKey<"path">;
}) & ({
    destRelation?: Relation.CreateSingleOperation;
    destRelationId?: never;
} | {
    destRelation?: Relation.UpdateOperation;
    destRelationId?: never;
} | {
    destRelation?: Relation.RemoveOperation;
    destRelationId?: never;
} | {
    destRelation?: never;
    destRelationId?: ForeignKey<"destRelation">;
})) & {
    [k: string]: any;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {} & (({
    sourceRelation?: Relation.UpdateOperation | Relation.RemoveOperation;
}) & ({
    path?: Path.UpdateOperation | Path.RemoveOperation;
}) & ({
    destRelation?: Relation.UpdateOperation | Relation.RemoveOperation;
}));
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type RelationIdSubQuery = Selection<RelationIdProjection>;
export type PathIdSubQuery = Selection<PathIdProjection>;
export type RelationAuthIdSubQuery = Selection<RelationAuthIdProjection>;
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
