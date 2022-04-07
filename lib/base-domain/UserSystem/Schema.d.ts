import { String, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as User from "../User/Schema";
import * as System from "../System/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime | null;
    userId: ForeignKey<"user">;
    systemId: ForeignKey<"system">;
    relation: 'owner';
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime | null;
    userId: ForeignKey<"user">;
    systemId: ForeignKey<"system">;
    relation: 'owner';
    user: User.Schema;
    system: System.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.UserSystemIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    userId: Q_StringValue | SubQuery.UserIdSubQuery;
    user: User.Filter;
    systemId: Q_StringValue | SubQuery.SystemIdSubQuery;
    system: System.Filter;
    relation: Q_EnumValue<'owner'>;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    userId?: 1;
    user?: User.Projection;
    systemId?: 1;
    system?: System.Projection;
    relation?: 1;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    userId?: string;
    user?: User.ExportProjection;
    systemId?: string;
    system?: System.ExportProjection;
    relation?: string;
} & Partial<ExprOp<OpAttr>>;
declare type UserSystemIdProjection = OneOf<{
    id: 1;
}>;
declare type UserIdProjection = OneOf<{
    userId: 1;
}>;
declare type SystemIdProjection = OneOf<{
    systemId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    userId: 1;
    user: User.SortAttr;
    systemId: 1;
    system: System.SortAttr;
    relation: 1;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
declare type CreateOperationData = FormCreateData<Omit<OpSchema, "userId" | "systemId" | "user" | "system"> & ({
    user?: User.CreateSingleOperation | (User.UpdateOperation & {
        id: String<64>;
    });
    userId?: undefined;
} | {
    user?: undefined;
    userId?: String<64>;
}) & ({
    system?: System.CreateSingleOperation | (System.UpdateOperation & {
        id: String<64>;
    });
    systemId?: undefined;
} | {
    system?: undefined;
    systemId?: String<64>;
}) & {
    [k: string]: any;
}>;
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "userId" | "systemId" | "user" | "system">> & ({
    user?: User.CreateSingleOperation | Omit<User.UpdateOperation, "id" | "ids" | "filter">;
    userId?: undefined;
} | {
    user?: undefined;
    userId?: String<64>;
}) & ({
    system?: System.CreateSingleOperation | Omit<System.UpdateOperation, "id" | "ids" | "filter">;
    systemId?: undefined;
} | {
    system?: undefined;
    systemId?: String<64>;
}) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter>;
declare type RemoveOperationData = {} & {
    user?: Omit<User.UpdateOperation | User.RemoveOperation, "id" | "ids" | "filter">;
    system?: Omit<System.UpdateOperation | System.RemoveOperation, "id" | "ids" | "filter">;
} & {
    [k: string]: any;
};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type SystemIdSubQuery = Selection<SystemIdProjection>;
export declare type UserSystemIdSubQuery = Selection<UserSystemIdProjection>;
export declare type NativeAttr = OpAttr | `user.${User.NativeAttr}` | `system.${System.NativeAttr}`;
export declare type FullAttr = NativeAttr;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
};
export {};
