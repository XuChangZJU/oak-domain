import { String, Datetime, PrimaryKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as OperEntity from "../OperEntity/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    action: String<16>;
    data: Object;
    filter?: Object | null;
    extra?: Object | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    action: String<16>;
    data: Object;
    filter?: Object | null;
    extra?: Object | null;
    operEntity$oper?: Array<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.OperIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    action: Q_StringValue;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    action?: 1;
    data?: 1;
    filter?: 1;
    extra?: 1;
    operEntity$oper?: OperEntity.Selection & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    action?: string;
    data?: string;
    filter?: string;
    extra?: string;
    operEntity$oper?: OperEntity.Exportation & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr>>;
declare type OperIdProjection = OneOf<{
    id: 1;
}>;
export declare type SortAttr = {
    id: 1;
} | {
    $$createAt$$: 1;
} | {
    $$updateAt$$: 1;
} | {
    action: 1;
} | {
    [k: string]: any;
} | OneOf<ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = Omit<OakOperation<"select", P, Filter, Sorter>, "id">;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<OpSchema> & {
    [k: string]: any;
    operEntity$oper?: OakOperation<"update", Omit<OperEntity.UpdateOperationData, "oper" | "operId">, OperEntity.Filter> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "oper" | "operId"> | Omit<OperEntity.CreateOperationData, "oper" | "operId">[]> | OakOperation<"update", Omit<OperEntity.UpdateOperationData, "oper" | "operId">, OperEntity.Filter>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<OpSchema> & {
    [k: string]: any;
    operEntitys$oper?: OperEntity.UpdateOperation | OperEntity.RemoveOperation | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "oper" | "operId"> | Omit<OperEntity.CreateOperationData, "oper" | "operId">[]> | OperEntity.UpdateOperation | OperEntity.RemoveOperation>;
};
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type OperIdSubQuery = Selection<OperIdProjection>;
export declare type NativeAttr = OpAttr;
export declare type FullAttr = NativeAttr | `operEntitys$${number}.${OperEntity.NativeAttr}`;
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
