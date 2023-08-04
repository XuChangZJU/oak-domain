import { AsyncContext } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict } from "./Entity";

export type Exportation<ED extends EntityDict, T extends keyof ED, K extends string> = {
    name: string;
    id: string;
    entity: T;
    projection: ED[T]['Selection']['data'];
    headers?: K[];
    makeHeaders?: (dataList: Partial<ED[T]['Schema']>[]) => string[];
    fn: (data: ED[T]['Schema'], context?: AsyncContext<ED>, properties?: Record<string, any>) => Promise<Partial<Record<string, string | number | boolean | null>>> | Partial<Record<string, string | number | boolean | null>>;
};

export type Importation<ED extends EntityDict, T extends keyof ED, K extends string> = {
    name: string;
    id: string;
    entity: T;
    headers: K[];
    // 解析过程中如果出错，请抛出OakImportDataParseException异常
    fn: (data: Partial<Record<K, string | number | boolean>>[], context: AsyncContext<ED>, option?: Record<string, any>) => Promise<ED[T]['CreateMulti']['data']>;
};