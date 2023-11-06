import { ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey, SubQueryPredicateMetadata } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, AggregationResult } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import { String } from "../../types/DataType";
import { EntityShape } from "../../types/Entity";
import * as UserEntityGrant from "../UserEntityGrant/Schema";
import * as User from "../User/Schema";
import * as Relation from "../Relation/Schema";
import * as UserRelation from "../UserRelation/Schema";
import * as ModiEntity from "../ModiEntity/Schema";
import * as OperEntity from "../OperEntity/Schema";
export type OpSchema = EntityShape & {
    uegId: ForeignKey<"userEntityGrant">;
    userId: ForeignKey<"user">;
    relationId: ForeignKey<"relation">;
    claimEntityId: String<64>;
    userRelationId: ForeignKey<"userRelation">;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    uegId: ForeignKey<"userEntityGrant">;
    userId: ForeignKey<"user">;
    relationId: ForeignKey<"relation">;
    claimEntityId: String<64>;
    userRelationId: ForeignKey<"userRelation">;
    ueg: UserEntityGrant.Schema;
    user: User.Schema;
    relation: Relation.Schema;
    userRelation: UserRelation.Schema;
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
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    uegId: Q_StringValue;
    ueg: UserEntityGrant.Filter;
    userId: Q_StringValue;
    user: User.Filter;
    relationId: Q_StringValue;
    relation: Relation.Filter;
    claimEntityId: Q_StringValue;
    userRelationId: Q_StringValue;
    userRelation: UserRelation.Filter;
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
    uegId?: number;
    ueg?: UserEntityGrant.Projection;
    userId?: number;
    user?: User.Projection;
    relationId?: number;
    relation?: Relation.Projection;
    claimEntityId?: number;
    userRelationId?: number;
    userRelation?: UserRelation.Projection;
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
type UserEntityClaimIdProjection = OneOf<{
    id: number;
}>;
type UserEntityGrantIdProjection = OneOf<{
    uegId: number;
}>;
type UserIdProjection = OneOf<{
    userId: number;
}>;
type RelationIdProjection = OneOf<{
    relationId: number;
}>;
type UserRelationIdProjection = OneOf<{
    userRelationId: number;
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
    uegId: number;
} | {
    ueg: UserEntityGrant.SortAttr;
} | {
    userId: number;
} | {
    user: User.SortAttr;
} | {
    relationId: number;
} | {
    relation: Relation.SortAttr;
} | {
    claimEntityId: number;
} | {
    userRelationId: number;
} | {
    userRelation: UserRelation.SortAttr;
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
export type CreateOperationData = FormCreateData<Omit<OpSchema, "uegId" | "userId" | "relationId" | "userRelationId">> & (({
    uegId?: never;
    ueg: UserEntityGrant.CreateSingleOperation;
} | {
    uegId: ForeignKey<"ueg">;
    ueg?: UserEntityGrant.UpdateOperation;
} | {
    uegId: ForeignKey<"ueg">;
}) & ({
    userId?: never;
    user: User.CreateSingleOperation;
} | {
    userId: ForeignKey<"user">;
    user?: User.UpdateOperation;
} | {
    userId: ForeignKey<"user">;
}) & ({
    relationId?: never;
    relation: Relation.CreateSingleOperation;
} | {
    relationId: ForeignKey<"relation">;
    relation?: Relation.UpdateOperation;
} | {
    relationId: ForeignKey<"relation">;
}) & ({
    userRelationId?: never;
    userRelation: UserRelation.CreateSingleOperation;
} | {
    userRelationId: ForeignKey<"userRelation">;
    userRelation?: UserRelation.UpdateOperation;
} | {
    userRelationId: ForeignKey<"userRelation">;
})) & {
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<Omit<OpSchema, "uegId" | "userId" | "relationId" | "userRelationId">> & (({
    ueg: UserEntityGrant.CreateSingleOperation;
    uegId?: never;
} | {
    ueg: UserEntityGrant.UpdateOperation;
    uegId?: never;
} | {
    ueg: UserEntityGrant.RemoveOperation;
    uegId?: never;
} | {
    ueg?: never;
    uegId?: ForeignKey<"ueg"> | null;
}) & ({
    user: User.CreateSingleOperation;
    userId?: never;
} | {
    user: User.UpdateOperation;
    userId?: never;
} | {
    user: User.RemoveOperation;
    userId?: never;
} | {
    user?: never;
    userId?: ForeignKey<"user"> | null;
}) & ({
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
    relationId?: ForeignKey<"relation"> | null;
}) & ({
    userRelation: UserRelation.CreateSingleOperation;
    userRelationId?: never;
} | {
    userRelation: UserRelation.UpdateOperation;
    userRelationId?: never;
} | {
    userRelation: UserRelation.RemoveOperation;
    userRelationId?: never;
} | {
    userRelation?: never;
    userRelationId?: ForeignKey<"userRelation"> | null;
})) & {
    [k: string]: any;
    modiEntity$entity?: OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "entity" | "entityId">>>;
    operEntity$entity?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId">>>;
};
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {} & (({
    ueg?: UserEntityGrant.UpdateOperation | UserEntityGrant.RemoveOperation;
}) & ({
    user?: User.UpdateOperation | User.RemoveOperation;
}) & ({
    relation?: Relation.UpdateOperation | Relation.RemoveOperation;
}) & ({
    userRelation?: UserRelation.UpdateOperation | UserRelation.RemoveOperation;
}));
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type UserEntityGrantIdSubQuery = Selection<UserEntityGrantIdProjection>;
export type UserIdSubQuery = Selection<UserIdProjection>;
export type RelationIdSubQuery = Selection<RelationIdProjection>;
export type UserRelationIdSubQuery = Selection<UserRelationIdProjection>;
export type UserEntityClaimIdSubQuery = Selection<UserEntityClaimIdProjection>;
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
