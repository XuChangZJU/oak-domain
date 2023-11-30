import { ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_NumberValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import { String } from "../../types/DataType";
import { EntityShape } from "../../types/Entity";
import * as Oper from "../Oper/Schema";
import * as ActionAuth from "../ActionAuth/Schema";
import * as I18n from "../I18n/Schema";
import * as Path from "../Path/Schema";
import * as Relation from "../Relation/Schema";
import * as RelationAuth from "../RelationAuth/Schema";
import * as User from "../User/Schema";
import * as UserEntityClaim from "../UserEntityClaim/Schema";
import * as UserEntityGrant from "../UserEntityGrant/Schema";
import * as UserRelation from "../UserRelation/Schema";
export type OpSchema = EntityShape & {
    operId: ForeignKey<"oper">;
    entity: "actionAuth" | "i18n" | "path" | "relation" | "relationAuth" | "user" | "userEntityClaim" | "userEntityGrant" | "userRelation" | string;
    entityId: String<64>;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    operId: ForeignKey<"oper">;
    entity: "actionAuth" | "i18n" | "path" | "relation" | "relationAuth" | "user" | "userEntityClaim" | "userEntityGrant" | "userRelation" | string;
    entityId: String<64>;
    oper: Oper.Schema;
    actionAuth?: ActionAuth.Schema;
    i18n?: I18n.Schema;
    path?: Path.Schema;
    relation?: Relation.Schema;
    relationAuth?: RelationAuth.Schema;
    user?: User.Schema;
    userEntityClaim?: UserEntityClaim.Schema;
    userEntityGrant?: UserEntityGrant.Schema;
    userRelation?: UserRelation.Schema;
} & {
    [A in ExpressionKey]?: any;
};
type AttrFilter = {
    id: Q_StringValue;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_NumberValue;
    $$updateAt$$: Q_DateValue;
    operId: Q_StringValue;
    oper: Oper.Filter;
    entity: Q_EnumValue<"actionAuth" | "i18n" | "path" | "relation" | "relationAuth" | "user" | "userEntityClaim" | "userEntityGrant" | "userRelation" | string>;
    entityId: Q_StringValue;
    actionAuth: ActionAuth.Filter;
    i18n: I18n.Filter;
    path: Path.Filter;
    relation: Relation.Filter;
    relationAuth: RelationAuth.Filter;
    user: User.Filter;
    userEntityClaim: UserEntityClaim.Filter;
    userEntityGrant: UserEntityGrant.Filter;
    userRelation: UserRelation.Filter;
};
export type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export type Projection = {
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
    i18n?: I18n.Projection;
    path?: Path.Projection;
    relation?: Relation.Projection;
    relationAuth?: RelationAuth.Projection;
    user?: User.Projection;
    userEntityClaim?: UserEntityClaim.Projection;
    userEntityGrant?: UserEntityGrant.Projection;
    userRelation?: UserRelation.Projection;
} & Partial<ExprOp<OpAttr | string>>;
type OperEntityIdProjection = OneOf<{
    id: number;
}>;
type OperIdProjection = OneOf<{
    operId: number;
}>;
type ActionAuthIdProjection = OneOf<{
    entityId: number;
}>;
type I18nIdProjection = OneOf<{
    entityId: number;
}>;
type PathIdProjection = OneOf<{
    entityId: number;
}>;
type RelationIdProjection = OneOf<{
    entityId: number;
}>;
type RelationAuthIdProjection = OneOf<{
    entityId: number;
}>;
type UserIdProjection = OneOf<{
    entityId: number;
}>;
type UserEntityClaimIdProjection = OneOf<{
    entityId: number;
}>;
type UserEntityGrantIdProjection = OneOf<{
    entityId: number;
}>;
type UserRelationIdProjection = OneOf<{
    entityId: number;
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
    i18n: I18n.SortAttr;
} | {
    path: Path.SortAttr;
} | {
    relation: Relation.SortAttr;
} | {
    relationAuth: RelationAuth.SortAttr;
} | {
    user: User.SortAttr;
} | {
    userEntityClaim: UserEntityClaim.SortAttr;
} | {
    userEntityGrant: UserEntityGrant.SortAttr;
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
export type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId" | "operId">> & (({
    operId?: never;
    oper: Oper.CreateSingleOperation;
} | {
    oper?: never;
    operId: ForeignKey<"oper">;
})) & ({
    entity?: never;
    entityId?: never;
    actionAuth: ActionAuth.CreateSingleOperation;
} | {
    entity: "actionAuth";
    entityId: ForeignKey<"ActionAuth">;
    actionAuth?: ActionAuth.UpdateOperation;
} | {
    entity: "actionAuth";
    entityId: ForeignKey<"ActionAuth">;
    actionAuth?: never;
} | {
    entity: "i18n";
    entityId: ForeignKey<"I18n">;
    i18n?: never;
} | {
    entity?: never;
    entityId?: never;
    path: Path.CreateSingleOperation;
} | {
    entity: "path";
    entityId: ForeignKey<"Path">;
    path?: Path.UpdateOperation;
} | {
    entity: "path";
    entityId: ForeignKey<"Path">;
    path?: never;
} | {
    entity?: never;
    entityId?: never;
    relation: Relation.CreateSingleOperation;
} | {
    entity: "relation";
    entityId: ForeignKey<"Relation">;
    relation?: Relation.UpdateOperation;
} | {
    entity: "relation";
    entityId: ForeignKey<"Relation">;
    relation?: never;
} | {
    entity?: never;
    entityId?: never;
    relationAuth: RelationAuth.CreateSingleOperation;
} | {
    entity: "relationAuth";
    entityId: ForeignKey<"RelationAuth">;
    relationAuth?: RelationAuth.UpdateOperation;
} | {
    entity: "relationAuth";
    entityId: ForeignKey<"RelationAuth">;
    relationAuth?: never;
} | {
    entity?: never;
    entityId?: never;
    user: User.CreateSingleOperation;
} | {
    entity: "user";
    entityId: ForeignKey<"User">;
    user?: User.UpdateOperation;
} | {
    entity: "user";
    entityId: ForeignKey<"User">;
    user?: never;
} | {
    entity?: never;
    entityId?: never;
    userEntityClaim: UserEntityClaim.CreateSingleOperation;
} | {
    entity: "userEntityClaim";
    entityId: ForeignKey<"UserEntityClaim">;
    userEntityClaim?: UserEntityClaim.UpdateOperation;
} | {
    entity: "userEntityClaim";
    entityId: ForeignKey<"UserEntityClaim">;
    userEntityClaim?: never;
} | {
    entity?: never;
    entityId?: never;
    userEntityGrant: UserEntityGrant.CreateSingleOperation;
} | {
    entity: "userEntityGrant";
    entityId: ForeignKey<"UserEntityGrant">;
    userEntityGrant?: UserEntityGrant.UpdateOperation;
} | {
    entity: "userEntityGrant";
    entityId: ForeignKey<"UserEntityGrant">;
    userEntityGrant?: never;
} | {
    entity?: never;
    entityId?: never;
    userRelation: UserRelation.CreateSingleOperation;
} | {
    entity: "userRelation";
    entityId: ForeignKey<"UserRelation">;
    userRelation?: UserRelation.UpdateOperation;
} | {
    entity: "userRelation";
    entityId: ForeignKey<"UserRelation">;
    userRelation?: never;
} | {
    entity?: string;
    entityId?: string;
    [K: string]: any;
});
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<Omit<OpSchema, "entity" | "entityId" | "operId">> & (({
    oper?: Oper.CreateSingleOperation;
    operId?: never;
} | {
    oper?: never;
    operId?: ForeignKey<"oper">;
})) & ({
    actionAuth?: ActionAuth.CreateSingleOperation | ActionAuth.UpdateOperation | ActionAuth.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    path?: Path.CreateSingleOperation | Path.UpdateOperation | Path.RemoveOperation;
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
    userEntityClaim?: UserEntityClaim.CreateSingleOperation | UserEntityClaim.UpdateOperation | UserEntityClaim.RemoveOperation;
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
    entity?: ("actionAuth" | "i18n" | "path" | "relation" | "relationAuth" | "user" | "userEntityClaim" | "userEntityGrant" | "userRelation" | string) | null;
    entityId?: ForeignKey<"ActionAuth" | "I18n" | "Path" | "Relation" | "RelationAuth" | "User" | "UserEntityClaim" | "UserEntityGrant" | "UserRelation"> | null;
    actionAuth?: never;
    i18n?: never;
    path?: never;
    relation?: never;
    relationAuth?: never;
    user?: never;
    userEntityClaim?: never;
    userEntityGrant?: never;
    userRelation?: never;
}) & {
    [k: string]: any;
};
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {} & ({
    actionAuth?: ActionAuth.UpdateOperation | ActionAuth.RemoveOperation;
} | {
    path?: Path.UpdateOperation | Path.RemoveOperation;
} | {
    relation?: Relation.UpdateOperation | Relation.RemoveOperation;
} | {
    relationAuth?: RelationAuth.UpdateOperation | RelationAuth.RemoveOperation;
} | {
    user?: User.UpdateOperation | User.RemoveOperation;
} | {
    userEntityClaim?: UserEntityClaim.UpdateOperation | UserEntityClaim.RemoveOperation;
} | {
    userEntityGrant?: UserEntityGrant.UpdateOperation | UserEntityGrant.RemoveOperation;
} | {
    userRelation?: UserRelation.UpdateOperation | UserRelation.RemoveOperation;
} | {
    [k: string]: any;
});
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type OperIdSubQuery = Selection<OperIdProjection>;
export type ActionAuthIdSubQuery = Selection<ActionAuthIdProjection>;
export type I18nIdSubQuery = Selection<I18nIdProjection>;
export type PathIdSubQuery = Selection<PathIdProjection>;
export type RelationIdSubQuery = Selection<RelationIdProjection>;
export type RelationAuthIdSubQuery = Selection<RelationAuthIdProjection>;
export type UserIdSubQuery = Selection<UserIdProjection>;
export type UserEntityClaimIdSubQuery = Selection<UserEntityClaimIdProjection>;
export type UserEntityGrantIdSubQuery = Selection<UserEntityGrantIdProjection>;
export type UserRelationIdSubQuery = Selection<UserRelationIdProjection>;
export type OperEntityIdSubQuery = Selection<OperEntityIdProjection>;
export type EntityDef = {
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
