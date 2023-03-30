import { String, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, Selection as OakSelection, MakeAction as OakMakeAction, EntityShape } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import * as Oper from "../Oper/Schema";
export declare type OpSchema = EntityShape & {
    operId: ForeignKey<"oper">;
    targetEntityId: String<64>;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
    operId: ForeignKey<"oper">;
    targetEntityId: String<64>;
    oper: Oper.Schema;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.OperEntityIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    operId: Q_StringValue | SubQuery.OperIdSubQuery;
    oper: Oper.Filter;
    targetEntityId: Q_StringValue;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: number;
    $$createAt$$?: number;
    $$updateAt$$?: number;
    $$seq$$?: number;
    operId?: number;
    oper?: Oper.Projection;
    targetEntityId?: number;
} & Partial<ExprOp<OpAttr | string>>;
declare type OperEntityIdProjection = OneOf<{
    id: number;
}>;
declare type OperIdProjection = OneOf<{
    operId: number;
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
    targetEntityId: number;
} | {
    [k: string]: any;
} | OneOf<ExprOp<OpAttr | string>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P extends Object = Projection> = OakSelection<"select", P, Filter, Sorter>;
export declare type Selection<P extends Object = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Aggregation = DeduceAggregation<Projection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "operId">> & (({
    operId?: never;
    oper: Oper.CreateSingleOperation;
} | {
    operId: String<64>;
}));
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "operId">> & (({
    oper: Oper.CreateSingleOperation;
    operId?: never;
} | {
    oper?: never;
    operId?: String<64> | null;
})) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export declare type OperIdSubQuery = Selection<OperIdProjection>;
export declare type OperEntityIdSubQuery = Selection<OperEntityIdProjection>;
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
