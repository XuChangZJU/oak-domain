import { String, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, MakeAction as OakMakeAction, EntityShape } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import * as Oper from "../Oper/Schema";
import * as Modi from "../Modi/Schema";
import * as User from "../User/Schema";
export declare type OpSchema = EntityShape & {
    operId: ForeignKey<"oper">;
    entity: "modi" | "user" | string;
    entityId: String<64>;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
    operId: ForeignKey<"oper">;
    entity: "modi" | "user" | string;
    entityId: String<64>;
    oper: Oper.Schema;
    modi?: Modi.Schema;
    user?: User.Schema;
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
    modi: Modi.Filter;
    user: User.Filter;
};
export declare type Filter<E = Q_EnumValue<"modi" | "user" | string>> = MakeFilter<AttrFilter<E> & ExprOp<OpAttr | string>>;
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
    modi?: Modi.Projection;
    user?: User.Projection;
} & Partial<ExprOp<OpAttr | string>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    $$seq$$?: string;
    operId?: string;
    oper?: Oper.ExportProjection;
    entity?: string;
    entityId?: string;
    modi?: Modi.ExportProjection;
    user?: User.ExportProjection;
} & Partial<ExprOp<OpAttr | string>>;
declare type OperEntityIdProjection = OneOf<{
    id: number;
}>;
declare type OperIdProjection = OneOf<{
    operId: number;
}>;
declare type ModiIdProjection = OneOf<{
    entityId: number;
}>;
declare type UserIdProjection = OneOf<{
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
    modi: Modi.SortAttr;
} | {
    user: User.SortAttr;
} | {
    [k: string]: any;
} | OneOf<ExprOp<OpAttr | string>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P extends Object = Projection> = Omit<OakOperation<"select", P, Filter, Sorter>, "id">;
export declare type Selection<P extends Object = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Aggregation = Omit<DeduceAggregation<Schema, Projection, Filter, Sorter>, "id">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "entity" | "entityId" | "operId">> & (({
    operId?: never;
    oper: Oper.CreateSingleOperation;
} | {
    operId: String<64>;
})) & ({
    entity?: never;
    entityId?: never;
    modi: Modi.CreateSingleOperation;
} | {
    entity: "modi";
    entityId: String<64>;
    modi: Modi.UpdateOperation;
} | {
    entity: "modi";
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
    modi?: Modi.CreateSingleOperation | Modi.UpdateOperation | Modi.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    user?: User.CreateSingleOperation | User.UpdateOperation | User.RemoveOperation;
    entityId?: never;
    entity?: never;
} | {
    entity?: ("modi" | "user" | string) | null;
    entityId?: String<64> | null;
}) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & ({
    modi?: Modi.UpdateOperation | Modi.RemoveOperation;
} | {
    user?: User.UpdateOperation | User.RemoveOperation;
} | {
    [k: string]: any;
});
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type OperIdSubQuery = Selection<OperIdProjection>;
export declare type ModiIdSubQuery = Selection<ModiIdProjection>;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type OperEntityIdSubQuery = Selection<OperEntityIdProjection>;
export declare type NativeAttr = OpAttr | `oper.${Oper.NativeAttr}` | `entity.${Modi.NativeAttr}` | `entity.${User.NativeAttr}`;
export declare type FullAttr = NativeAttr;
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
