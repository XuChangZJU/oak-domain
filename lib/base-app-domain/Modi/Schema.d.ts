import { String, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation, MakeAction as OakMakeAction } from "../../types/Entity";
import { Action, ParticularAction, IState } from "./Action";
import * as ModiEntity from "../ModiEntity/Schema";
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
    parentId?: ForeignKey<"modi"> | null;
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
    filter?: Object | null;
    extra?: Object | null;
    parentId?: ForeignKey<"modi"> | null;
    iState?: IState | null;
    parent?: Schema | null;
    modi$parent?: Array<Schema>;
    modiEntity$modi?: Array<ModiEntity.Schema>;
    operEntity$entity?: Array<OperEntity.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.ModiIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    action: Q_StringValue;
    parentId: Q_StringValue | SubQuery.ModiIdSubQuery;
    parent: Filter;
    iState: Q_EnumValue<IState>;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr | string>>;
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
    parentId?: 1;
    parent?: Projection;
    iState?: 1;
    modi$parent?: Selection & {
        $entity: "modi";
    };
    modiEntity$modi?: ModiEntity.Selection & {
        $entity: "modiEntity";
    };
    operEntity$entity?: OperEntity.Selection & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr | string>>;
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
    parentId?: string;
    parent?: ExportProjection;
    iState?: string;
    modi$parent?: Exportation & {
        $entity: "modi";
    };
    modiEntity$modi?: ModiEntity.Exportation & {
        $entity: "modiEntity";
    };
    operEntity$entity?: OperEntity.Exportation & {
        $entity: "operEntity";
    };
} & Partial<ExprOp<OpAttr | string>>;
declare type ModiIdProjection = OneOf<{
    id: 1;
    parentId: 1;
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
    parentId: 1;
} | {
    parent: SortAttr;
} | {
    iState: 1;
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
export declare type CreateOperationData = FormCreateData<Omit<OpSchema, "parentId">> & (({
    parentId?: never | null;
    parent?: CreateSingleOperation;
} | {
    parentId?: String<64>;
    parent?: UpdateOperation;
})) & {
    [k: string]: any;
    modi$parent?: OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "parent" | "parentId">, Filter> | Array<OakOperation<"create", Omit<CreateOperationData, "parent" | "parentId"> | Omit<CreateOperationData, "parent" | "parentId">[]> | OakOperation<UpdateOperation["action"], Omit<UpdateOperationData, "parent" | "parentId">, Filter>>;
    modiEntity$modi?: OakOperation<ModiEntity.UpdateOperation["action"], Omit<ModiEntity.UpdateOperationData, "modi" | "modiId">, ModiEntity.Filter> | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "modi" | "modiId"> | Omit<ModiEntity.CreateOperationData, "modi" | "modiId">[]> | OakOperation<ModiEntity.UpdateOperation["action"], Omit<ModiEntity.UpdateOperationData, "modi" | "modiId">, ModiEntity.Filter>>;
    operEntity$entity?: OakOperation<OperEntity.UpdateOperation["action"], Omit<OperEntity.UpdateOperationData, "entity" | "entityId">, OperEntity.Filter> | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId"> | Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | OakOperation<OperEntity.UpdateOperation["action"], Omit<OperEntity.UpdateOperationData, "entity" | "entityId">, OperEntity.Filter>>;
};
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
export declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "parentId">> & (({
    parent?: CreateSingleOperation | UpdateOperation | RemoveOperation;
    parentId?: undefined;
} | {
    parent?: undefined;
    parentId?: String<64> | null;
})) & {
    [k: string]: any;
    modis$parent?: UpdateOperation | RemoveOperation | Array<OakOperation<"create", Omit<CreateOperationData, "parent" | "parentId"> | Omit<CreateOperationData, "parent" | "parentId">[]> | UpdateOperation | RemoveOperation>;
    modiEntitys$modi?: ModiEntity.UpdateOperation | ModiEntity.RemoveOperation | Array<OakOperation<"create", Omit<ModiEntity.CreateOperationData, "modi" | "modiId"> | Omit<ModiEntity.CreateOperationData, "modi" | "modiId">[]> | ModiEntity.UpdateOperation | ModiEntity.RemoveOperation>;
    operEntitys$entity?: OperEntity.UpdateOperation | OperEntity.RemoveOperation | Array<OakOperation<"create", Omit<OperEntity.CreateOperationData, "entity" | "entityId"> | Omit<OperEntity.CreateOperationData, "entity" | "entityId">[]> | OperEntity.UpdateOperation | OperEntity.RemoveOperation>;
};
export declare type UpdateOperation = OakOperation<ParticularAction | "update" | string, UpdateOperationData, Filter, Sorter>;
export declare type RemoveOperationData = {} & (({
    parent?: UpdateOperation;
} | {
    parent?: RemoveOperation;
}));
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter, Sorter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type ModiIdSubQuery = Selection<ModiIdProjection>;
export declare type NativeAttr = OpAttr | `parent.${OpAttr}` | `parent.parent.${OpAttr}` | `parent.parent.parent.${OpAttr}`;
export declare type FullAttr = NativeAttr | `modis$${number}.${NativeAttr}` | `modiEntitys$${number}.${ModiEntity.NativeAttr}` | `operEntitys$${number}.${OperEntity.NativeAttr}`;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: OakMakeAction<Action> | string;
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
