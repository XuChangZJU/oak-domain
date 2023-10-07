import { AsyncContext } from "../store/AsyncRowStore";
import { EntityDict } from "./Entity";
export type Exportation<ED extends EntityDict, T extends keyof ED, K extends string, Cxt extends AsyncContext<ED>> = {
    name: string;
    id: string;
    entity: T;
    projection: ED[T]['Selection']['data'];
    headers?: K[];
    makeHeaders?: (dataList: Partial<ED[T]['Schema']>[]) => string[];
    fn: (data: ED[T]['Schema'], context?: Cxt, properties?: Record<string, any>) => Promise<Partial<Record<string, string | number | boolean | null>>> | Partial<Record<string, string | number | boolean | null>>;
};
export type Importation<ED extends EntityDict, T extends keyof ED, K extends string, Cxt extends AsyncContext<ED>> = {
    name: string;
    id: string;
    entity: T;
    headers: K[];
    fn: (data: Partial<Record<K, string | number | boolean>>[], context: Cxt, option?: Record<string, any>) => Promise<ED[T]['CreateMulti']['data']>;
};
