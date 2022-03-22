import { String, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Address from "../Address/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime;
    name: String<32>;
    level: 'province' | 'city' | 'district' | 'street';
    parentId: ForeignKey<"area">;
    code: String<12>;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime;
    name: String<32>;
    level: 'province' | 'city' | 'district' | 'street';
    parentId: ForeignKey<"area">;
    code: String<12>;
    parent: Schema;
    address$area?: Array<Address.Schema>;
    area$parent?: Array<Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.AreaIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    name: Q_StringValue;
    level: Q_EnumValue<'province' | 'city' | 'district' | 'street'>;
    parentId: Q_StringValue | SubQuery.AreaIdSubQuery;
    parent: Filter;
    code: Q_StringValue;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    name?: 1;
    level?: 1;
    parentId?: 1;
    parent?: Projection;
    code?: 1;
    address$area?: Address.Selection;
    area$parent?: Selection;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    name?: string;
    level?: string;
    parentId?: string;
    parent?: ExportProjection;
    code?: string;
    address$area?: Address.Exportation;
    area$parent?: Exportation;
} & Partial<ExprOp<OpAttr>>;
declare type AreaIdProjection = OneOf<{
    id: 1;
    parentId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    name: 1;
    level: 1;
    parentId: 1;
    parent: SortAttr;
    code: 1;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
declare type CreateOperationData = FormCreateData<Omit<OpSchema, "parentId" | "parent"> & ({
    parent?: CreateSingleOperation | (UpdateOperation & {
        id: String<64>;
    });
    parentId?: undefined;
} | {
    parent?: undefined;
    parentId?: String<64>;
}) & {
    [k: string]: any;
    address$area?: Address.CreateOperation | Address.UpdateOperation;
    area$parent?: CreateOperation | UpdateOperation;
}>;
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "parentId" | "parent">> & ({
    parent?: CreateSingleOperation | Omit<UpdateOperation, "id" | "ids" | "filter">;
    parentId?: undefined;
} | {
    parent?: undefined;
    parentId?: String<64>;
}) & {
    [k: string]: any;
    addresss$area?: Address.CreateOperation | Omit<Address.UpdateOperation, "id" | "ids" | "filter">;
    areas$parent?: CreateOperation | Omit<UpdateOperation, "id" | "ids" | "filter">;
};
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter>;
declare type RemoveOperationData = {} & {
    parent?: Omit<UpdateOperation | RemoveOperation, "id" | "ids" | "filter">;
} & {
    [k: string]: any;
    addresss$area?: Omit<Address.UpdateOperation | Address.RemoveOperation, "id" | "ids" | "filter">;
    areas$parent?: Omit<UpdateOperation | RemoveOperation, "id" | "ids" | "filter">;
};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type AreaIdSubQuery = Selection<AreaIdProjection>;
export declare type NativeAttr = OpAttr | `parent.${OpAttr}` | `parent.parent.${OpAttr}` | `parent.parent.parent.${OpAttr}`;
export declare type FullAttr = NativeAttr | `addresss$${number}.${Address.NativeAttr}` | `areas$${number}.${NativeAttr}`;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
};
export {};
