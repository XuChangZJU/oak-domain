import { IncomingHttpHeaders } from "http";
import { RowStore } from ".";
import { Context } from "./Context";
import { EntityDict, OpRecord } from "./Entity";
import { OakException } from "./Exception";

export abstract class Connector<ED extends EntityDict, Cxt extends Context<ED>> {
    abstract callAspect(name: string, params: any, context: Cxt): Promise<{
        result: any;
        opRecords: OpRecord<ED>[];
    }>;

    abstract getRouter(): string;

    abstract parseRequest(headers: IncomingHttpHeaders, body: any, store: RowStore<ED, Cxt>): Promise<{ name: string; params: any; context: Cxt; }>;

    abstract serializeResult(result: any, context: Cxt, headers: IncomingHttpHeaders, body: any): {
        body: any;
        headers?: Record<string, any>;
    };

    abstract serializeException(exception: OakException, headers: IncomingHttpHeaders, body: any): {
        body: any;
        headers?: Record<string, any>;
    };
}