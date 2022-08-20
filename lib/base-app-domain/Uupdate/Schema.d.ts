import { String, Datetime, PrimaryKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { Action, ParticularAction, IState } from "./Action";
import * as Ooperation from "../Ooperation/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    action: String<16>;
    data: Object;
    entity: String<32>;
    entityId: String<64>;
    extra?: Object | null;
    iState?: IState | null;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$deleteAt$$?: Datetime | null;
    action: String<16>;
    data: Object;
    entity: String<32>;
    entityId: String<64>;
    extra?: Object | null;
    iState?: IState | null;
    ooperation$entity?: Array<Ooperation.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.UupdateIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    action: Q_StringValue;
    entity: Q_StringValue;
    entityId: Q_StringValue;
    iState: Q_EnumValue<IState>;
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
    entity?: 1;
    entityId?: 1;
    extra?: 1;
    iState?: 1;
    ooperation$entity?: Ooperation.Selection & {
        $entity: "ooperation";
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
    entity?: string;
    entityId?: string;
    extra?: string;
    iState?: string;
    ooperation$entity?: Ooperation.Exportation & {
        $entity: "ooperation";
    };
} & Partial<ExprOp<OpAttr>>;
declare type UupdateIdProjection = OneOf<{
    id: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    action: 1;
    entity: 1;
    entityId: 1;
    iState: 1;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
export declare type CreateOperationData = FormCreateData<OpSchema> & {
    [k: string]: any;
    ooperation$entity?: OakOperation<"update", Omit<Ooperation.UpdateOperationData, "entity" | "entityId">, Ooperation.Filter> | Array<OakOperation<"create", Omit<Ooperation.CreateOperationData, "entity" | "entityId"> | Omit<Ooperation.CreateOperationData, "entity" | "entityId">[]> | OakOperation<"update", Omit<Ooperation.UpdateOperationData, "entity" | "entityId">, Ooperation.Filter>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<OpSchema> & {
    [k: string]: any;
    ooperations$entity?: Ooperation.UpdateOperation | Ooperation.RemoveOperation | Array<OakOperation<"create", Omit<Ooperation.CreateOperationData, "entity" | "entityId"> | Omit<Ooperation.CreateOperationData, "entity" | "entityId">[]> | Ooperation.UpdateOperation | Ooperation.RemoveOperation>;
};
export declare type UpdateOperation = OakOperation<ParticularAction | "update", UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type UupdateIdSubQuery = Selection<UupdateIdProjection>;
export declare type NativeAttr = OpAttr;
export declare type FullAttr = NativeAttr | `ooperations$${number}.${Ooperation.NativeAttr}`;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: Action;
    Selection: Selection;
    Operation: Operation;
    Create: CreateOperation;
    Update: UpdateOperation;
    Remove: RemoveOperation;
    CreateSingle: CreateSingleOperation;
    CreateMulti: CreateMultipleOperation;
    ParticularAction: ParticularAction;
};
export {};
