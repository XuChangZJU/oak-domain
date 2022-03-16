import { String, Boolean, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_BooleanValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as User from "../User/Schema";
import * as Application from "../Application/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$?: Datetime;
    $$updateAt$$?: Datetime;
    $$removeAt$$?: Datetime;
    origin: 'mp' | 'public';
    openId?: String<32>;
    unionId?: String<32>;
    accessToken: String<32>;
    sessionKey?: String<64>;
    subscribed?: Boolean;
    subscribedAt?: Datetime;
    unsubscribedAt?: Datetime;
    userId?: ForeignKey<"user">;
    applicationId: ForeignKey<"application">;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$?: Datetime;
    $$updateAt$$?: Datetime;
    $$removeAt$$?: Datetime;
    origin: 'mp' | 'public';
    openId?: String<32>;
    unionId?: String<32>;
    accessToken: String<32>;
    sessionKey?: String<64>;
    subscribed?: Boolean;
    subscribedAt?: Datetime;
    unsubscribedAt?: Datetime;
    userId?: ForeignKey<"user">;
    applicationId: ForeignKey<"application">;
    user?: User.Schema;
    application: Application.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.WechatUserIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    origin: Q_EnumValue<'mp' | 'public'>;
    openId: Q_StringValue;
    unionId: Q_StringValue;
    accessToken: Q_StringValue;
    sessionKey: Q_StringValue;
    subscribed: Q_BooleanValue;
    subscribedAt: Q_DateValue;
    unsubscribedAt: Q_DateValue;
    userId: Q_StringValue | SubQuery.UserIdSubQuery;
    user: User.Filter;
    applicationId: Q_StringValue | SubQuery.ApplicationIdSubQuery;
    application: Application.Filter;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    origin?: 1;
    openId?: 1;
    unionId?: 1;
    accessToken?: 1;
    sessionKey?: 1;
    subscribed?: 1;
    subscribedAt?: 1;
    unsubscribedAt?: 1;
    userId?: 1;
    user?: User.Projection;
    applicationId?: 1;
    application?: Application.Projection;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    origin?: string;
    openId?: string;
    unionId?: string;
    accessToken?: string;
    sessionKey?: string;
    subscribed?: string;
    subscribedAt?: string;
    unsubscribedAt?: string;
    userId?: string;
    user?: User.ExportProjection;
    applicationId?: string;
    application?: Application.ExportProjection;
} & Partial<ExprOp<OpAttr>>;
declare type WechatUserIdProjection = OneOf<{
    id: 1;
}>;
declare type UserIdProjection = OneOf<{
    userId: 1;
}>;
declare type ApplicationIdProjection = OneOf<{
    applicationId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    origin: 1;
    openId: 1;
    unionId: 1;
    accessToken: 1;
    sessionKey: 1;
    subscribed: 1;
    subscribedAt: 1;
    unsubscribedAt: 1;
    userId: 1;
    user: User.SortAttr;
    applicationId: 1;
    application: Application.SortAttr;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
declare type CreateOperationData = Omit<OpSchema, "userId" | "applicationId"> & ({
    user?: User.CreateSingleOperation | (User.UpdateOperation & {
        id: String<64>;
    });
    userId?: undefined;
} | {
    user?: undefined;
    userId?: String<64>;
}) & ({
    application?: Application.CreateSingleOperation | (Application.UpdateOperation & {
        id: String<64>;
    });
    applicationId?: undefined;
} | {
    application?: undefined;
    applicationId?: String<64>;
});
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = Partial<Omit<OpSchema, "id" | "userId" | "applicationId">> & ({
    user?: User.CreateSingleOperation | Omit<User.UpdateOperation, "id" | "ids" | "filter">;
    userId?: undefined;
} | {
    user?: undefined;
    userId?: String<64>;
}) & ({
    application?: Application.CreateSingleOperation | Omit<Application.UpdateOperation, "id" | "ids" | "filter">;
    applicationId?: undefined;
} | {
    application?: undefined;
    applicationId?: String<64>;
});
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter>;
declare type RemoveOperationData = {} & {
    user?: Omit<User.UpdateOperation | User.RemoveOperation, "id" | "ids" | "filter">;
    application?: Omit<Application.UpdateOperation | Application.RemoveOperation, "id" | "ids" | "filter">;
};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type ApplicationIdSubQuery = Selection<ApplicationIdProjection>;
export declare type WechatUserIdSubQuery = Selection<WechatUserIdProjection>;
export declare type NativeAttr = OpAttr | `user.${User.NativeAttr}` | `application.${Application.NativeAttr}`;
export declare type FullAttr = NativeAttr;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
};
export {};
