import { String, Int, Float, Double, Boolean, Text, Datetime, File, Image, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_BooleanValue, Q_NumberValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, FulltextFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf, ValueOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Area from "../Area/Schema";
export type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime;
    detail: String<32>;
    areaId: ForeignKey<"area">;
    phone: String<12>;
    name: String<32>;
    default: Boolean;
    remark: Text;
};
export type OpAttr = keyof OpSchema;
export type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime;
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
type AttrFilter = {
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
export type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export type Projection = {
    "#id"?: NodeId;
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
export type ExportProjection = {
    "#id"?: NodeId;
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
type AddressIdProjection = OneOf<{
    id: 1;
}>;
type AreaIdProjection = OneOf<{
    areaId: 1;
}>;
export type SortAttr = OneOf<{
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
export type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export type Sorter = SortNode[];
export type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
type CreateOperationData = FormCreateData<Omit<OpSchema, "areaId"> & ({
    area?: Area.CreateSingleOperation | (Area.UpdateOperation & {
        id: String<64>;
    });
    areaId?: undefined;
} | {
    area?: undefined;
    areaId?: String<64>;
})>;
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
type UpdateOperationData = FormUpdateData<Omit<OpSchema, "areaId">> & ({
    area?: Area.CreateSingleOperation | Omit<Area.UpdateOperation, "id" | "ids" | "filter">;
    areaId?: undefined;
} | {
    area?: undefined;
    areaId?: String<64>;
});
export type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter>;
type RemoveOperationData = {} & {
    area?: Omit<Area.UpdateOperation | Area.RemoveOperation, "id" | "ids" | "filter">;
};
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export type AreaIdSubQuery = Selection<AreaIdProjection>;
export type AddressIdSubQuery = Selection<AddressIdProjection>;
export type NativeAttr = OpAttr | `area.${Area.NativeAttr}`;
export type FullAttr = NativeAttr;
export type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
};