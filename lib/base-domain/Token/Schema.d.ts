import { String, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { AbleState } from "../../actions/action";
import { ParticularAction, Action } from "./Action";
import * as Application from "../Application/Schema";
import * as User from "../User/Schema";
import * as Mobile from "../Mobile/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime | null;
    applicationId: ForeignKey<"application">;
    entity: "mobile" | string;
    entityId: String<64>;
    userId?: ForeignKey<"user"> | null;
    playerId?: ForeignKey<"user"> | null;
    ableState?: AbleState | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime | null;
    applicationId: ForeignKey<"application">;
    entity: "mobile" | string;
    entityId: String<64>;
    userId?: ForeignKey<"user"> | null;
    playerId?: ForeignKey<"user"> | null;
    ableState?: AbleState | null;
    application: Application.Schema;
    user?: User.Schema | null;
    player?: User.Schema | null;
    mobile?: Mobile.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter<E> = {
    id: Q_StringValue | SubQuery.TokenIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    applicationId: Q_StringValue | SubQuery.ApplicationIdSubQuery;
    application: Application.Filter;
    entity: E;
    entityId: Q_StringValue;
    userId: Q_StringValue | SubQuery.UserIdSubQuery;
    user: User.Filter;
    playerId: Q_StringValue | SubQuery.UserIdSubQuery;
    player: User.Filter;
    ableState: Q_EnumValue<AbleState>;
};
export declare type Filter<E = Q_EnumValue<"mobile" | string>> = MakeFilter<AttrFilter<E> & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    applicationId?: 1;
    application?: Application.Projection;
    entity?: 1;
    entityId?: 1;
    userId?: 1;
    user?: User.Projection;
    playerId?: 1;
    player?: User.Projection;
    ableState?: 1;
    mobile?: Mobile.Projection;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    applicationId?: string;
    application?: Application.ExportProjection;
    entity?: string;
    entityId?: string;
    userId?: string;
    user?: User.ExportProjection;
    playerId?: string;
    player?: User.ExportProjection;
    ableState?: string;
    mobile?: Mobile.ExportProjection;
} & Partial<ExprOp<OpAttr>>;
declare type TokenIdProjection = OneOf<{
    id: 1;
}>;
declare type ApplicationIdProjection = OneOf<{
    applicationId: 1;
}>;
declare type UserIdProjection = OneOf<{
    userId: 1;
    playerId: 1;
}>;
declare type MobileIdProjection = OneOf<{
    entityId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    applicationId: 1;
    application: Application.SortAttr;
    entity: 1;
    entityId: 1;
    userId: 1;
    user: User.SortAttr;
    playerId: 1;
    player: User.SortAttr;
    ableState: 1;
    mobile: Mobile.SortAttr;
    [k: string]: any;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
declare type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId"> & ({
    entity: "mobile" | string;
    entityId: String<64>;
} | ({
    entity?: undefined;
    entityId?: undefined;
} & OneOf<{
    mobile: Mobile.CreateSingleOperation | (Mobile.UpdateOperation & {
        id: String<64>;
    });
    [K: string]: any;
}>)) & {
    [k: string]: any;
}>;
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "entity" | "entityId">> & ({
    entity?: "mobile" | string;
    entityId?: String<64>;
    mobile?: undefined;
} | ({
    entity?: undefined;
    entityId?: undefined;
} & OneOf<{
    mobile: Mobile.CreateSingleOperation | Omit<Mobile.UpdateOperation, "id" | "ids" | "filter">;
    [K: string]: any;
}>)) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<ParticularAction | "update", UpdateOperationData, Filter>;
declare type RemoveOperationData = {} & OneOf<{
    mobile?: Omit<Mobile.UpdateOperation | Mobile.RemoveOperation, "id" | "ids" | "filter">;
    [K: string]: any;
}> & {
    [k: string]: any;
};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type ApplicationIdSubQuery = Selection<ApplicationIdProjection>;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type MobileIdSubQuery = Selection<MobileIdProjection>;
export declare type TokenIdSubQuery = Selection<TokenIdProjection>;
export declare type NativeAttr = OpAttr | `application.${Application.NativeAttr}` | `user.${User.NativeAttr}` | `player.${User.NativeAttr}` | `entity.${Mobile.NativeAttr}`;
export declare type FullAttr = NativeAttr;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: Action;
    Selection: Selection;
    Operation: Operation;
    ParticularAction: ParticularAction;
};
export {};
