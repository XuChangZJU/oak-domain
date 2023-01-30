import { String, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, DeduceAggregation, Operation as OakOperation, MakeAction as OakMakeAction, EntityShape, AggregationResult } from "../../types/Entity";
import { AppendOnlyAction } from "../../actions/action";
import * as User from "../User/Schema";
import * as OperEntity from "../OperEntity/Schema";
export type OpSchema = EntityShape & {
    action: String<16>;
    data: Object;
    filter?: Object | null;
    extra?: Object | null;
    operatorId?: ForeignKey<"user"> | null;
};
export type OpAttr = keyof OpSchema;
export type Schema = EntityShape & {
    action: String<16>;
    data: Object;
    filter?: Object | null;
    extra?: Object | null;
    operatorId?: ForeignKey<"user"> | null;
    operator?: User.Schema | null;
    operEntity$oper?: Array<OperEntity.Schema>;
    operEntity$oper$$aggr?: AggregationResult<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
type AttrFilter = {
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
export type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
export type Projection = {
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
    operEntity$oper$$aggr?: OperEntity.Aggregation & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr | string>>;
type OperIdProjection = OneOf<{
    id: number;
}>;
type UserIdProjection = OneOf<{
    operatorId: number;
}>;
export type SortAttr = {
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
export type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export type Sorter = SortNode[];
export type SelectOperation<P extends Object = Projection> = Omit<OakOperation<"select", P, Filter, Sorter>, "id">;
export type Selection<P extends Object = Projection> = Omit<SelectOperation<P>, "action">;
export type Aggregation = Omit<DeduceAggregation<Projection, Filter, Sorter>, "id">;
export type CreateOperationData = FormCreateData<Omit<OpSchema, "operatorId">> & (({
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
export type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export type UpdateOperationData = FormUpdateData<Omit<OpSchema, "operatorId">> & (({
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
export type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export type RemoveOperationData = {} & (({
    operator?: User.UpdateOperation | User.RemoveOperation;
}));
export type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export type Operation = CreateOperation | UpdateOperation | RemoveOperation;
export type UserIdSubQuery = Selection<UserIdProjection>;
export type OperIdSubQuery = Selection<OperIdProjection>;
export type EntityDef = {
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
