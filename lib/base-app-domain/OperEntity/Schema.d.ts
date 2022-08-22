import { String, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation, MakeAction as OakMakeAction } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as Oper from "../Oper/Schema";
import * as Modi from "../Modi/Schema";
import * as User from "../User/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    operId: ForeignKey<"oper">;
    entity: "modi" | "user" | string;
    entityId: String<64>;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
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
    $$updateAt$$: Q_DateValue;
    operId: Q_StringValue | SubQuery.OperIdSubQuery;
    oper: Oper.Filter;
    entity: E;
    entityId: Q_StringValue;
};
export declare type Filter<E = Q_EnumValue<"modi" | "user" | string>> = MakeFilter<AttrFilter<E> & ExprOp<OpAttr | string>>;
export declare type Projection = {
    "#id"?: NodeId;
    [k: string]: any;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    operId?: 1;
    oper?: Oper.Projection;
    entity?: 1;
    entityId?: 1;
    modi?: Modi.Projection;
    user?: User.Projection;
} & Partial<ExprOp<OpAttr | string>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    [k: string]: any;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    operId?: string;
    oper?: Oper.ExportProjection;
    entity?: string;
    entityId?: string;
    modi?: Modi.ExportProjection;
    user?: User.ExportProjection;
} & Partial<ExprOp<OpAttr | string>>;
declare type OperEntityIdProjection = OneOf<{
    id: 1;
}>;
declare type OperIdProjection = OneOf<{
    operId: 1;
}>;
declare type ModiIdProjection = OneOf<{
    entityId: 1;
}>;
declare type UserIdProjection = OneOf<{
    entityId: 1;
}>;
export declare type SortAttr = {
    id: 1;
} | {
    $$createAt$$: 1;
} | {
    $$updateAt$$: 1;
} | {
    operId: 1;
} | {
    oper: Oper.SortAttr;
} | {
    entity: 1;
} | {
    entityId: 1;
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
export declare type SelectOperation<P = Projection> = Omit<OakOperation<"select", P, Filter, Sorter>, "id">;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "operId" | "entityId" | "entity">> & (({
    operId?: never | null;
    oper: Oper.CreateSingleOperation;
} | {
    operId: String<64>;
    oper?: Oper.UpdateOperation;
})) & ({
    entity?: never;
    entityId?: never;
    modi: Modi.CreateSingleOperation;
} | {
    entity: "modi";
    entityId: String<64>;
    modi?: Modi.UpdateOperation;
} | {
    entity?: never;
    entityId?: never;
    user: User.CreateSingleOperation;
} | {
    entity: "user";
    entityId: String<64>;
    user?: User.UpdateOperation;
} | {
    [K: string]: any;
}) & {
    [k: string]: any;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "operId" | "entityId" | "entity">> & (({
    oper?: Oper.CreateSingleOperation | Oper.UpdateOperation | Oper.RemoveOperation;
    operId?: undefined;
} | {
    oper?: undefined;
    operId?: String<64> | null;
})) & ({
    modi?: Modi.CreateSingleOperation | Modi.UpdateOperation | Modi.RemoveOperation;
    entityId?: undefined;
    entity?: undefined;
} | {
    user?: User.CreateSingleOperation | User.UpdateOperation | User.RemoveOperation;
    entityId?: undefined;
    entity?: undefined;
} | {
    entity?: ("modi" | "user" | string) | null;
    entityId?: String<64> | null;
}) & {
    [k: string]: any;
};
export declare type UpdateOperation = OakOperation<"update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & (({
    oper?: Oper.UpdateOperation;
} | {
    oper?: Oper.RemoveOperation;
})) & ({
    modi?: Modi.UpdateOperation;
} | {
    modi?: Modi.RemoveOperation;
} | {
    user?: User.UpdateOperation;
} | {
    user?: User.RemoveOperation;
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
    Action: OakMakeAction<GenericAction | string>;
    Selection: Selection;
    Operation: Operation;
    Create: CreateOperation;
    Update: UpdateOperation;
    Remove: RemoveOperation;
    CreateSingle: CreateSingleOperation;
    CreateMulti: CreateMultipleOperation;
};
export {};
