import { String, Datetime, PrimaryKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Update from "../Update/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    action: String<16>;
    data: Object;
    entity?: ("update" | string) | null;
    entityId?: String<64> | null;
    filter?: Object | null;
    extra?: Object | null;
    operatorId: String<32>;
    operatorInfo?: Object | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    action: String<16>;
    data: Object;
    entity?: ("update" | string) | null;
    entityId?: String<64> | null;
    filter?: Object | null;
    extra?: Object | null;
    operatorId: String<32>;
    operatorInfo?: Object | null;
    update?: Update.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter<E> = {
    id: Q_StringValue | SubQuery.ActionIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    action: Q_StringValue;
    entity: E;
    entityId: Q_StringValue;
    operatorId: Q_StringValue;
};
export declare type Filter<E = Q_EnumValue<"update" | string>> = MakeFilter<AttrFilter<E> & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    action?: 1;
    data?: 1;
    entity?: 1;
    entityId?: 1;
    filter?: 1;
    extra?: 1;
    operatorId?: 1;
    operatorInfo?: 1;
    update?: Update.Projection;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    action?: string;
    data?: string;
    entity?: string;
    entityId?: string;
    filter?: string;
    extra?: string;
    operatorId?: string;
    operatorInfo?: string;
    update?: Update.ExportProjection;
} & Partial<ExprOp<OpAttr>>;
declare type ActionIdProjection = OneOf<{
    id: 1;
}>;
declare type UpdateIdProjection = OneOf<{
    entityId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    action: 1;
    entity: 1;
    entityId: 1;
    operatorId: 1;
    update: Update.SortAttr;
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
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "entityId" | "entity" | "entityId">> & ({
    entity?: never;
    entityId?: never;
    update: Update.CreateSingleOperation;
} | {
    entity: "update";
    entityId: String<64>;
    update?: Update.UpdateOperation;
} | {
    [K: string]: any;
}) & {
    [k: string]: any;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "entityId" | "entity" | "entityId">> & ({
    update?: Update.CreateSingleOperation | Update.UpdateOperation | Update.RemoveOperation;
    entityId?: undefined;
    entity?: undefined;
} | {
    entity?: ("update" | string) | null;
    entityId?: String<64> | null;
}) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & ({
    update?: Update.UpdateOperation;
} | {
    update?: Update.RemoveOperation;
} | {
    [k: string]: any;
});
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type UpdateIdSubQuery = Selection<UpdateIdProjection>;
export declare type ActionIdSubQuery = Selection<ActionIdProjection>;
export declare type NativeAttr = OpAttr | `entity.${Update.NativeAttr}`;
export declare type FullAttr = NativeAttr;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
    Create: CreateOperation;
    Update: UpdateOperation;
    Remove: RemoveOperation;
    CreateSingle: CreateSingleOperation;
    CreateMulti: CreateMultipleOperation;
};
export {};
