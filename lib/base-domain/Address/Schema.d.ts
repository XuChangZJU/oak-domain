import { String, Boolean, Text, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_BooleanValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Area from "../Area/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime | null;
    detail: String<32>;
    areaId: ForeignKey<"area">;
    phone: String<12>;
    name: String<32>;
    default: Boolean;
    remark: Text;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime | null;
    detail: String<32>;
    areaId: ForeignKey<"area">;
    phone: String<12>;
    name: String<32>;
    default: Boolean;
    remark: Text;
    area: Area.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.AddressIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    detail: Q_StringValue;
    areaId: Q_StringValue | SubQuery.AreaIdSubQuery;
    area: Area.Filter;
    phone: Q_StringValue;
    name: Q_StringValue;
    default: Q_BooleanValue;
    remark: Q_StringValue;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    detail?: 1;
    areaId?: 1;
    area?: Area.Projection;
    phone?: 1;
    name?: 1;
    default?: 1;
    remark?: 1;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    detail?: string;
    areaId?: string;
    area?: Area.ExportProjection;
    phone?: string;
    name?: string;
    default?: string;
    remark?: string;
} & Partial<ExprOp<OpAttr>>;
declare type AddressIdProjection = OneOf<{
    id: 1;
}>;
declare type AreaIdProjection = OneOf<{
    areaId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    detail: 1;
    areaId: 1;
    area: Area.SortAttr;
    phone: 1;
    name: 1;
    default: 1;
    remark: 1;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
declare type CreateOperationData = FormCreateData<Omit<OpSchema, "areaId" | "area"> & ({
    area?: Area.CreateSingleOperation | (Area.UpdateOperation & {
        id: String<64>;
    });
    areaId?: undefined;
} | {
    area?: undefined;
    areaId?: String<64>;
}) & {
    [k: string]: any;
}>;
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "areaId" | "area">> & ({
    area?: Area.CreateSingleOperation | Omit<Area.UpdateOperation, "id" | "ids" | "filter">;
    areaId?: undefined;
} | {
    area?: undefined;
    areaId?: String<64>;
}) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter>;
declare type RemoveOperationData = {} & {
    area?: Omit<Area.UpdateOperation | Area.RemoveOperation, "id" | "ids" | "filter">;
} & {
    [k: string]: any;
};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type AreaIdSubQuery = Selection<AreaIdProjection>;
export declare type AddressIdSubQuery = Selection<AddressIdProjection>;
export declare type NativeAttr = OpAttr | `area.${Area.NativeAttr}`;
export declare type FullAttr = NativeAttr;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
};
export {};
