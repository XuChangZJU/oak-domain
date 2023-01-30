import { AsyncContext } from "../store/AsyncRowStore";
import { EntityDict } from "./Entity";
export type Exportation<ED extends EntityDict, T extends keyof ED, K extends string> = {
    name: string;
    id: string;
    entity: T;
    projection: ED[T]['Selection']['data'];
    headers: K[];
    fn: (data: ED[T]['Schema']) => Partial<Record<K, string | number | boolean | null>>;
};
export type Importation<ED extends EntityDict, T extends keyof ED, K extends string> = {
    name: string;
    id: string;
    entity: T;
    headers: K[];
    fn: (data: Partial<Record<K, string | number | boolean>>[], context: AsyncContext<ED>, option?: Record<string, any>) => Promise<ED[T]['CreateMulti']['data']>;
};
