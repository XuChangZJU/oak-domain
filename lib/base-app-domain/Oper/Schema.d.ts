import { String, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, MakeAction as OakMakeAction, EntityShape } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import * as User from "../User/Schema";
import * as OperEntity from "../OperEntity/Schema";
export declare type OpSchema = EntityShape & {
    action: String<16>;
    data: Object;
    filter?: Object | null;
    extra?: Object | null;
    operatorId?: ForeignKey<"user"> | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = EntityShape & {
    action: String<16>;
    data: Object;
    filter?: Object | null;
    extra?: Object | null;
    operatorId?: ForeignKey<"user"> | null;
    operator?: User.Schema | null;
    operEntity$oper?: Array<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.OperIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$seq$$: Q_StringValue;
    $$updateAt$$: Q_DateValue;
    action: Q_StringValue;
    data: Object;
    filter: Object;
    extra: Object;
    operatorId: Q_StringValue | SubQuery.UserIdSubQuery;
    operator: User.Filter;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: number;
    $$createAt$$?: number;
    $$updateAt$$?: number;
    $$seq$$?: number;
    action?: number;
    data?: number;
    filter?: number;
    extra?: number;
    operatorId?: number;
    operator?: User.Projection;
    operEntity$oper?: OperEntity.Selection & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr | string>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    $$seq$$?: string;
    action?: string;
    data?: string;
    filter?: string;
    extra?: string;
    operatorId?: string;
    operator?: User.ExportProjection;
    operEntity$oper?: OperEntity.Exportation & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr | string>>;
declare type OperIdProjection = OneOf<{
    id: number;
}>;
declare type UserIdProjection = OneOf<{
    operatorId: number;
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
    action: number;
} | {
    operatorId: number;
} | {
    operator: User.SortAttr;
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
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "operatorId">> & (({
    operatorId?: never;
    operator?: User.CreateSingleOperation;
} | {
    operatorId: String<64>;
    operator?: User.UpdateOperation;
} | {
    operatorId?: String<64>;
})) & {
    operEntity$oper?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "oper" | "operId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "oper" | "operId">>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "operatorId">> & (({
    operator: User.CreateSingleOperation;
    operatorId?: never;
} | {
    operator: User.UpdateOperation;
    operatorId?: never;
} | {
    operator: User.RemoveOperation;
    operatorId?: never;
} | {
    operator?: never;
    operatorId?: String<64> | null;
})) & {
    [k: string]: any;
    operEntitys$oper?: OakOperation<"create", Omit<OperEntity.CreateOperationData, "oper" | "operId">[]> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "oper" | "operId">>>;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & (({
    operator?: User.UpdateOperation | User.RemoveOperation;
}));
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type UserIdSubQuery = Selection<UserIdProjection>;
export declare type OperIdSubQuery = Selection<OperIdProjection>;
export declare type NativeAttr = OpAttr | `operator.${User.NativeAttr}`;
export declare type FullAttr = NativeAttr | `operEntitys$${number}.${OperEntity.NativeAttr}`;
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
