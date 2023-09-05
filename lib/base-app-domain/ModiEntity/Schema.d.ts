import { ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import { String } from "../../types/DataType";
import { EntityShape } from "../../types/Entity";
import * as Modi from "../Modi/Schema";
import * as ActionAuth from "../ActionAuth/Schema";
import * as I18n from "../I18n/Schema";
import * as Relation from "../Relation/Schema";
import * as RelationAuth from "../RelationAuth/Schema";
import * as User from "../User/Schema";
import * as UserEntityGrant from "../UserEntityGrant/Schema";
import * as UserRelation from "../UserRelation/Schema";
export type OpSchema = EntityShape & {
    modiId: ForeignKey<"modi">;
    entity: "actionAuth" | "i18n" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string;
    entityId: String<64>;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    modiId: ForeignKey<"modi">;
    entity: "actionAuth" | "i18n" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string;
    entityId: String<64>;
    modi: Modi.Schema;
    actionAuth?: ActionAuth.Schema;
    i18n?: I18n.Schema;
    relation?: Relation.Schema;
    relationAuth?: RelationAuth.Schema;
    user?: User.Schema;
    userEntityGrant?: UserEntityGrant.Schema;
    userRelation?: UserRelation.Schema;
} & {
    [A in ExpressionKey]?: any;
};
type AttrFilter = {
    id: Q_StringValue;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    modiId: Q_StringValue;
    modi: Modi.Filter;
    entity: Q_EnumValue<"actionAuth" | "i18n" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string>;
    entityId: Q_StringValue;
    actionAuth: ActionAuth.Filter;
    i18n: I18n.Filter;
    relation: Relation.Filter;
    relationAuth: RelationAuth.Filter;
    user: User.Filter;
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
    modiId?: number;
    modi?: Modi.Projection;
    entity?: number;
    entityId?: number;
    actionAuth?: ActionAuth.Projection;
    i18n?: I18n.Projection;
    relation?: Relation.Projection;
    relationAuth?: RelationAuth.Projection;
    user?: User.Projection;
    userEntityGrant?: UserEntityGrant.Projection;
    userRelation?: UserRelation.Projection;
} & Partial<ExprOp<OpAttr | string>>;
type ModiEntityIdProjection = OneOf<{
    id: number;
}>;
type ModiIdProjection = OneOf<{
    modiId: number;
}>;
type ActionAuthIdProjection = OneOf<{
    entityId: number;
}>;
type I18nIdProjection = OneOf<{
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
    modiId: number;
} | {
    modi: Modi.SortAttr;
} | {
    entity: number;
} | {
    entityId: number;
} | {
    actionAuth: ActionAuth.SortAttr;
} | {
    i18n: I18n.SortAttr;
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
export type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export type Sorter = SortNode[];
export type SelectOperation<P extends Object = Projection> = OakSelection<"select", P, Filter, Sorter>;
export type Selection<P extends Object = Projection> = SelectOperation<P>;
export type Aggregation = DeduceAggregation<Projection, Filter, Sorter>;
export type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId" | "modiId">> & (({
    modiId?: never;
    modi: Modi.CreateSingleOperation;
} | {
    modiId: ForeignKey<"modi">;
    modi?: Modi.UpdateOperation;
} | {
    modiId: ForeignKey<"modi">;
})) & ({
    entity?: never;
    entityId?: never;
    actionAuth: ActionAuth.CreateSingleOperation;
} | {
    entity: "actionAuth";
    entityId: ForeignKey<"ActionAuth">;
    actionAuth: ActionAuth.UpdateOperation;
} | {
    entity: "actionAuth";
    entityId: ForeignKey<"ActionAuth">;
} | {
    entity: "i18n";
    entityId: ForeignKey<"I18n">;
} | {
    entity?: never;
    entityId?: never;
    relation: Relation.CreateSingleOperation;
} | {
    entity: "relation";
    entityId: ForeignKey<"Relation">;
    relation: Relation.UpdateOperation;
} | {
    entity: "relation";
    entityId: ForeignKey<"Relation">;
} | {
    entity?: never;
    entityId?: never;
    relationAuth: RelationAuth.CreateSingleOperation;
} | {
    entity: "relationAuth";
    entityId: ForeignKey<"RelationAuth">;
    relationAuth: RelationAuth.UpdateOperation;
} | {
    entity: "relationAuth";
    entityId: ForeignKey<"RelationAuth">;
} | {
    entity?: never;
    entityId?: never;
    user: User.CreateSingleOperation;
} | {
    entity: "user";
    entityId: ForeignKey<"User">;
    user: User.UpdateOperation;
} | {
    entity: "user";
    entityId: ForeignKey<"User">;
} | {
    entity?: never;
    entityId?: never;
    userEntityGrant: UserEntityGrant.CreateSingleOperation;
} | {
    entity: "userEntityGrant";
    entityId: ForeignKey<"UserEntityGrant">;
    userEntityGrant: UserEntityGrant.UpdateOperation;
} | {
    entity: "userEntityGrant";
    entityId: ForeignKey<"UserEntityGrant">;
} | {
    entity?: never;
    entityId?: never;
    userRelation: UserRelation.CreateSingleOperation;
} | {
    entity: "userRelation";
    entityId: ForeignKey<"UserRelation">;
    userRelation: UserRelation.UpdateOperation;
} | {
    entity: "userRelation";
    entityId: ForeignKey<"UserRelation">;
} | {
    entity?: string;
    entityId?: string;
    [K: string]: any;
});
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<Omit<OpSchema, "entity" | "entityId" | "modiId">> & (({
    modi: Modi.CreateSingleOperation;
    modiId?: never;
} | {
    modi: Modi.UpdateOperation;
    modiId?: never;
} | {
    modi: Modi.RemoveOperation;
    modiId?: never;
} | {
    modi?: never;
    modiId?: ForeignKey<"modi"> | null;
})) & ({
    actionAuth?: ActionAuth.CreateSingleOperation | ActionAuth.UpdateOperation | ActionAuth.RemoveOperation;
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
    entity?: ("actionAuth" | "i18n" | "relation" | "relationAuth" | "user" | "userEntityGrant" | "userRelation" | string) | null;
    entityId?: ForeignKey<"ActionAuth" | "I18n" | "Relation" | "RelationAuth" | "User" | "UserEntityGrant" | "UserRelation"> | null;
}) & {
    [k: string]: any;
};
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {} & (({
    modi?: Modi.UpdateOperation | Modi.RemoveOperation;
})) & ({
    actionAuth?: ActionAuth.UpdateOperation | ActionAuth.RemoveOperation;
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
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type ModiIdSubQuery = Selection<ModiIdProjection>;
export type ActionAuthIdSubQuery = Selection<ActionAuthIdProjection>;
export type I18nIdSubQuery = Selection<I18nIdProjection>;
export type RelationIdSubQuery = Selection<RelationIdProjection>;
export type RelationAuthIdSubQuery = Selection<RelationAuthIdProjection>;
export type UserIdSubQuery = Selection<UserIdProjection>;
export type UserEntityGrantIdSubQuery = Selection<UserEntityGrantIdProjection>;
export type UserRelationIdSubQuery = Selection<UserRelationIdProjection>;
export type ModiEntityIdSubQuery = Selection<ModiEntityIdProjection>;
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
