import { String, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, EntityShape } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import * as Oper from "../Oper/Schema";
import * as ActionAuth from "../ActionAuth/Schema";
import * as DirectActionAuth from "../DirectActionAuth/Schema";
import * as FreeActionAuth from "../FreeActionAuth/Schema";
import * as Relation from "../Relation/Schema";
import * as RelationAuth from "../RelationAuth/Schema";
import * as User from "../User/Schema";
import * as UserEntityGrant from "../UserEntityGrant/Schema";
import * as UserRelation from "../UserRelation/Schema";
export declare type OpSchema = EntityShape & {
    operId: ForeignKey<"oper">;
    entity: "actionAuth" | "directActionAuth" | "freeActionAuth" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string;
    entityId: String<64>;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
    operId: ForeignKey<"oper">;
    entity: "actionAuth" | "directActionAuth" | "freeActionAuth" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string;
    entityId: String<64>;
    oper: Oper.Schema;
    actionAuth?: ActionAuth.Schema;
    directActionAuth?: DirectActionAuth.Schema;
    freeActionAuth?: FreeActionAuth.Schema;
    relation?: Relation.Schema;
    relationAuth?: RelationAuth.Schema;
    user?: User.Schema;
    userEntityGrant?: UserEntityGrant.Schema;
    userRelation?: UserRelation.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter<E> = {
    id: Q_StringValue | SubQuery.OperEntityIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    operId: Q_StringValue | SubQuery.OperIdSubQuery;
    oper: Oper.Filter;
    entity: E;
    entityId: Q_StringValue;
    actionAuth: ActionAuth.Filter;
    directActionAuth: DirectActionAuth.Filter;
    freeActionAuth: FreeActionAuth.Filter;
    relation: Relation.Filter;
    relationAuth: RelationAuth.Filter;
    user: User.Filter;
    userEntityGrant: UserEntityGrant.Filter;
    userRelation: UserRelation.Filter;
};
export declare type Filter<E = Q_EnumValue<"actionAuth" | "directActionAuth" | "freeActionAuth" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string>> = MakeFilter<AttrFilter<E> & ExprOp<OpAttr | string>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: number;
    $$createAt$$?: number;
    $$updateAt$$?: number;
    $$seq$$?: number;
    operId?: number;
    oper?: Oper.Projection;
    entity?: number;
    entityId?: number;
    actionAuth?: ActionAuth.Projection;
    directActionAuth?: DirectActionAuth.Projection;
    freeActionAuth?: FreeActionAuth.Projection;
    relation?: Relation.Projection;
    relationAuth?: RelationAuth.Projection;
    user?: User.Projection;
    userEntityGrant?: UserEntityGrant.Projection;
    userRelation?: UserRelation.Projection;
} & Partial<ExprOp<OpAttr | string>>;
declare type OperEntityIdProjection = OneOf<{
    id: number;
}>;
declare type OperIdProjection = OneOf<{
    operId: number;
}>;
declare type ActionAuthIdProjection = OneOf<{
    entityId: number;
}>;
declare type DirectActionAuthIdProjection = OneOf<{
    entityId: number;
}>;
declare type FreeActionAuthIdProjection = OneOf<{
    entityId: number;
}>;
declare type RelationIdProjection = OneOf<{
    entityId: number;
}>;
declare type RelationAuthIdProjection = OneOf<{
    entityId: number;
}>;
declare type UserIdProjection = OneOf<{
    entityId: number;
}>;
declare type UserEntityGrantIdProjection = OneOf<{
    entityId: number;
}>;
declare type UserRelationIdProjection = OneOf<{
    entityId: number;
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
    operId: number;
} | {
    oper: Oper.SortAttr;
} | {
    entity: number;
} | {
    entityId: number;
} | {
    actionAuth: ActionAuth.SortAttr;
} | {
    directActionAuth: DirectActionAuth.SortAttr;
} | {
    freeActionAuth: FreeActionAuth.SortAttr;
} | {
    relation: Relation.SortAttr;
} | {
    relationAuth: RelationAuth.SortAttr;
} | {
    user: User.SortAttr;
} | {
    userEntityGrant: UserEntityGrant.SortAttr;
} | {
    userRelation: UserRelation.SortAttr;
} | {
    [k: string]: any;
} | OneOf<ExprOp<OpAttr | string>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P extends Object = Projection> = OakSelection<"select", P, Filter, Sorter>;
export declare type Selection<P extends Object = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Aggregation = DeduceAggregation<Projection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId" | "operId">> & (({
    operId?: never;
    oper: Oper.CreateSingleOperation;
} | {
    operId: String<64>;
})) & ({
    entity?: never;
    entityId?: never;
    actionAuth: ActionAuth.CreateSingleOperation;
} | {
    entity: "actionAuth";
    entityId: String<64>;
    actionAuth: ActionAuth.UpdateOperation;
} | {
    entity: "actionAuth";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    directActionAuth: DirectActionAuth.CreateSingleOperation;
} | {
    entity: "directActionAuth";
    entityId: String<64>;
    directActionAuth: DirectActionAuth.UpdateOperation;
} | {
    entity: "directActionAuth";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    freeActionAuth: FreeActionAuth.CreateSingleOperation;
} | {
    entity: "freeActionAuth";
    entityId: String<64>;
    freeActionAuth: FreeActionAuth.UpdateOperation;
} | {
    entity: "freeActionAuth";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    relation: Relation.CreateSingleOperation;
} | {
    entity: "relation";
    entityId: String<64>;
    relation: Relation.UpdateOperation;
} | {
    entity: "relation";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    relationAuth: RelationAuth.CreateSingleOperation;
} | {
    entity: "relationAuth";
    entityId: String<64>;
    relationAuth: RelationAuth.UpdateOperation;
} | {
    entity: "relationAuth";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    user: User.CreateSingleOperation;
} | {
    entity: "user";
    entityId: String<64>;
    user: User.UpdateOperation;
} | {
    entity: "user";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    userEntityGrant: UserEntityGrant.CreateSingleOperation;
} | {
    entity: "userEntityGrant";
    entityId: String<64>;
    userEntityGrant: UserEntityGrant.UpdateOperation;
} | {
    entity: "userEntityGrant";
    entityId: String<64>;
} | {
    entity?: never;
    entityId?: never;
    userRelation: UserRelation.CreateSingleOperation;
} | {
    entity: "userRelation";
    entityId: String<64>;
    userRelation: UserRelation.UpdateOperation;
} | {
    entity: "userRelation";
    entityId: String<64>;
} | {
    entity?: string;
    entityId?: string;
    [K: string]: any;
});
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "entity" | "entityId" | "operId">> & (({
    oper: Oper.CreateSingleOperation;
    operId?: never;
} | {
    oper?: never;
    operId?: String<64> | null;
})) & ({
    actionAuth?: ActionAuth.CreateSingleOperation | ActionAuth.UpdateOperation | ActionAuth.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    directActionAuth?: DirectActionAuth.CreateSingleOperation | DirectActionAuth.UpdateOperation | DirectActionAuth.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    freeActionAuth?: FreeActionAuth.CreateSingleOperation | FreeActionAuth.UpdateOperation | FreeActionAuth.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    relation?: Relation.CreateSingleOperation | Relation.UpdateOperation | Relation.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    relationAuth?: RelationAuth.CreateSingleOperation | RelationAuth.UpdateOperation | RelationAuth.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    user?: User.CreateSingleOperation | User.UpdateOperation | User.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    userEntityGrant?: UserEntityGrant.CreateSingleOperation | UserEntityGrant.UpdateOperation | UserEntityGrant.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    userRelation?: UserRelation.CreateSingleOperation | UserRelation.UpdateOperation | UserRelation.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    entity?: ("actionAuth" | "directActionAuth" | "freeActionAuth" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string) | null;
    entityId?: String<64> | null;
}) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & ({
    actionAuth?: ActionAuth.UpdateOperation | ActionAuth.RemoveOperation;
} | {
    directActionAuth?: DirectActionAuth.UpdateOperation | DirectActionAuth.RemoveOperation;
} | {
    freeActionAuth?: FreeActionAuth.UpdateOperation | FreeActionAuth.RemoveOperation;
} | {
    relation?: Relation.UpdateOperation | Relation.RemoveOperation;
} | {
    relationAuth?: RelationAuth.UpdateOperation | RelationAuth.RemoveOperation;
} | {
    user?: User.UpdateOperation | User.RemoveOperation;
} | {
    userEntityGrant?: UserEntityGrant.UpdateOperation | UserEntityGrant.RemoveOperation;
} | {
    userRelation?: UserRelation.UpdateOperation | UserRelation.RemoveOperation;
} | {
    [k: string]: any;
});
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export declare type OperIdSubQuery = Selection<OperIdProjection>;
export declare type ActionAuthIdSubQuery = Selection<ActionAuthIdProjection>;
export declare type DirectActionAuthIdSubQuery = Selection<DirectActionAuthIdProjection>;
export declare type FreeActionAuthIdSubQuery = Selection<FreeActionAuthIdProjection>;
export declare type RelationIdSubQuery = Selection<RelationIdProjection>;
export declare type RelationAuthIdSubQuery = Selection<RelationAuthIdProjection>;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type UserEntityGrantIdSubQuery = Selection<UserEntityGrantIdProjection>;
export declare type UserRelationIdSubQuery = Selection<UserRelationIdProjection>;
export declare type OperEntityIdSubQuery = Selection<OperEntityIdProjection>;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: OakMakeAction<AppendOnlyAction> | string;
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
