import { ClientRequest, IncomingHttpHeaders } from "http";
import { AsyncContext } from "../store/AsyncRowStore";
import { EntityDict } from "./Entity";

export interface Endpoint<ED extends EntityDict, BackCxt extends AsyncContext<ED>> {
    name: string;
    params?: string[];
    method: 'get' | 'post' | 'put' | 'delete';
    fn: (context: BackCxt, params: Record<string, string>, body: any, headers: IncomingHttpHeaders, req: ClientRequest) => Promise<any>;
};
