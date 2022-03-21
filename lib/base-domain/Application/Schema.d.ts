import { String, Text, Datetime, PrimaryKey, ForeignKey } from "../../types/DataType";
import { Q_DateValue, Q_StringValue, Q_EnumValue, NodeId, MakeFilter, ExprOp, ExpressionKey } from "../../types/Demand";
import { OneOf } from "../../types/Polyfill";
import * as SubQuery from "../_SubQuery";
import { FormCreateData, FormUpdateData, Operation as OakOperation } from "../../types/Entity";
import { GenericAction } from "../../actions/action";
import * as System from "../System/Schema";
import * as Token from "../Token/Schema";
import * as WechatUser from "../WechatUser/Schema";
import * as ExtraFile from "../ExtraFile/Schema";
export declare type OpSchema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime;
    name: String<32>;
    description: Text;
    type: 'web' | 'wechatPublic' | 'weChatMp';
    systemId: ForeignKey<"system">;
};
export declare type OpAttr = keyof OpSchema;
export declare type Schema = {
    id: PrimaryKey;
    $$createAt$$: Datetime;
    $$updateAt$$: Datetime;
    $$removeAt$$?: Datetime;
    name: String<32>;
    description: Text;
    type: 'web' | 'wechatPublic' | 'weChatMp';
    systemId: ForeignKey<"system">;
    system: System.Schema;
    token$application?: Array<Token.Schema>;
    wechatUser$application?: Array<WechatUser.Schema>;
    extraFile$entity?: Array<ExtraFile.Schema>;
} & {
    [A in ExpressionKey]?: any;
};
declare type AttrFilter = {
    id: Q_StringValue | SubQuery.ApplicationIdSubQuery;
    $$createAt$$: Q_DateValue;
    $$updateAt$$: Q_DateValue;
    name: Q_StringValue;
    description: Q_StringValue;
    type: Q_EnumValue<'web' | 'wechatPublic' | 'weChatMp'>;
    systemId: Q_StringValue | SubQuery.SystemIdSubQuery;
    system: System.Filter;
};
export declare type Filter = MakeFilter<AttrFilter & ExprOp<OpAttr>>;
export declare type Projection = {
    "#id"?: NodeId;
    id: 1;
    $$createAt$$?: 1;
    $$updateAt$$?: 1;
    name?: 1;
    description?: 1;
    type?: 1;
    systemId?: 1;
    system?: System.Projection;
    token$application?: Token.Selection;
    wechatUser$application?: WechatUser.Selection;
    extraFile$entity?: ExtraFile.Selection;
} & Partial<ExprOp<OpAttr>>;
export declare type ExportProjection = {
    "#id"?: NodeId;
    id?: string;
    $$createAt$$?: string;
    $$updateAt$$?: string;
    name?: string;
    description?: string;
    type?: string;
    systemId?: string;
    system?: System.ExportProjection;
    token$application?: Token.Exportation;
    wechatUser$application?: WechatUser.Exportation;
    extraFile$entity?: ExtraFile.Exportation;
} & Partial<ExprOp<OpAttr>>;
declare type ApplicationIdProjection = OneOf<{
    id: 1;
}>;
declare type SystemIdProjection = OneOf<{
    systemId: 1;
}>;
export declare type SortAttr = OneOf<{
    id: 1;
    $$createAt$$: 1;
    $$updateAt$$: 1;
    name: 1;
    description: 1;
    type: 1;
    systemId: 1;
    system: System.SortAttr;
} & ExprOp<OpAttr>>;
export declare type SortNode = {
    $attr: SortAttr;
    $direction?: "asc" | "desc";
};
export declare type Sorter = SortNode[];
export declare type SelectOperation<P = Projection> = OakOperation<"select", P, Filter, Sorter>;
export declare type Selection<P = Projection> = Omit<SelectOperation<P>, "action">;
export declare type Exportation = OakOperation<"export", ExportProjection, Filter, Sorter>;
declare type CreateOperationData = FormCreateData<Omit<OpSchema, "systemId"> & ({
    system?: System.CreateSingleOperation | (System.UpdateOperation & {
        id: String<64>;
    });
    systemId?: undefined;
} | {
    system?: undefined;
    systemId?: String<64>;
}) & {
    token$application?: Token.CreateOperation | Token.UpdateOperation;
    wechatUser$application?: WechatUser.CreateOperation | WechatUser.UpdateOperation;
    extraFile$entity?: ExtraFile.CreateOperation | ExtraFile.UpdateOperation;
}>;
export declare type CreateSingleOperation = OakOperation<"create", CreateOperationData>;
export declare type CreateMultipleOperation = OakOperation<"create", Array<CreateOperationData>>;
export declare type CreateOperation = CreateSingleOperation | CreateMultipleOperation;
declare type UpdateOperationData = FormUpdateData<Omit<OpSchema, "systemId">> & ({
    system?: System.CreateSingleOperation | Omit<System.UpdateOperation, "id" | "ids" | "filter">;
    systemId?: undefined;
} | {
    system?: undefined;
    systemId?: String<64>;
}) & {
    tokens$application?: Token.CreateOperation | Omit<Token.UpdateOperation, "id" | "ids" | "filter">;
    wechatUsers$application?: WechatUser.CreateOperation | Omit<WechatUser.UpdateOperation, "id" | "ids" | "filter">;
    extraFiles$entity?: ExtraFile.CreateOperation | Omit<ExtraFile.UpdateOperation, "id" | "ids" | "filter">;
};
export declare type UpdateOperation = OakOperation<"update", UpdateOperationData, Filter>;
declare type RemoveOperationData = {} & {
    system?: Omit<System.UpdateOperation | System.RemoveOperation, "id" | "ids" | "filter">;
} & {
    tokens$application?: Omit<Token.UpdateOperation | Token.RemoveOperation, "id" | "ids" | "filter">;
    wechatUsers$application?: Omit<WechatUser.UpdateOperation | WechatUser.RemoveOperation, "id" | "ids" | "filter">;
    extraFiles$entity?: Omit<ExtraFile.UpdateOperation | ExtraFile.RemoveOperation, "id" | "ids" | "filter">;
};
export declare type RemoveOperation = OakOperation<"remove", RemoveOperationData, Filter>;
export declare type Operation = CreateOperation | UpdateOperation | RemoveOperation | SelectOperation;
export declare type SystemIdSubQuery = Selection<SystemIdProjection>;
export declare type ApplicationIdSubQuery = Selection<ApplicationIdProjection>;
export declare type NativeAttr = OpAttr | `system.${System.NativeAttr}`;
export declare type FullAttr = NativeAttr | `tokens$${number}.${Token.NativeAttr}` | `wechatUsers$${number}.${WechatUser.NativeAttr}` | `extraFiles$${number}.${ExtraFile.NativeAttr}`;
export declare type EntityDef = {
    Schema: Schema;
    OpSchema: OpSchema;
    Action: GenericAction;
    Selection: Selection;
    Operation: Operation;
};
export {};
