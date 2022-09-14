/// <reference types="node" />
import { IncomingHttpHeaders } from "http";
import { UniversalContext } from "../store/UniversalContext";
import { Connector, EntityDict, OakException, OpRecord, RowStore } from "../types";
export declare class SimpleConnector<ED extends EntityDict, Cxt extends UniversalContext<ED>> extends Connector<ED, Cxt> {
    static ROUTER: string;
    private serverUrl;
    private makeException;
    private contextBuilder;
    constructor(serverUrl: string, makeException: (exceptionData: any) => OakException, contextBuilder: (str: string | undefined) => (store: RowStore<ED, Cxt>) => Promise<Cxt>);
    callAspect(name: string, params: any, context: Cxt): Promise<{
        result: any;
        opRecords: OpRecord<ED>[];
    }>;
    getRouter(): string;
    parseRequest(headers: IncomingHttpHeaders, body: any, store: RowStore<ED, Cxt>): Promise<{
        name: string;
        params: any;
        context: Cxt;
    }>;
    serializeResult(result: any, context: Cxt, headers: IncomingHttpHeaders, body: any): {
        body: any;
        headers?: Record<string, any> | undefined;
    };
    serializeException(exception: OakException, headers: IncomingHttpHeaders, body: any): {
        body: any;
        headers?: Record<string, any> | undefined;
    };
}
