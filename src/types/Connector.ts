import { IncomingHttpHeaders } from "http";
import { RowStore } from ".";
import { AsyncContext, AsyncRowStore } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OpRecord } from "./Entity";
import { OakException } from "./Exception";

export abstract class Connector<ED extends EntityDict, BackCxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>> {
    abstract callAspect(name: string, params: any, context: FrontCxt): Promise<{
        result: any;
        opRecords?: OpRecord<ED>[];
        message?: string | null;
    }>;

    abstract getRouter(): string;

    abstract parseRequest(headers: IncomingHttpHeaders, body: any, store: AsyncRowStore<ED, BackCxt>): Promise<{ name: string; params: any; context: BackCxt; }>;

    abstract serializeResult(result: any, context: BackCxt, headers: IncomingHttpHeaders, body: any): Promise<{
        body: any;
        headers?: Record<string, any>;
    }>;

    abstract serializeException(exception: OakException<ED>, headers: IncomingHttpHeaders, body: any): {
        body: any;
        headers?: Record<string, any>;
    };

    abstract getBridgeRouter(): string;
    
    abstract makeBridgeUrl(url: string, headers?: Record<string, string>): string;

    abstract parseBridgeRequestQuery(urlParams: string): {
        url: string;
        headers?: Record<string, string>;
    }
}