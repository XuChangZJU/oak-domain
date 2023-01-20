import { ClientRequest, IncomingHttpHeaders, IncomingMessage } from "http";
import { AsyncContext } from "../store/AsyncRowStore";
import { EntityDict } from "./Entity";

export interface Endpoint<ED extends EntityDict, BackCxt extends AsyncContext<ED>> {
    name: string;
    params?: string[];
    method: 'get' | 'post' | 'put' | 'delete';
    fn: (context: BackCxt, params: Record<string, string>, headers: IncomingHttpHeaders,
        req: IncomingMessage, body?: any) => Promise<any>;
};
