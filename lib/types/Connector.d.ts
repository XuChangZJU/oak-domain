/// <reference types="node" />
import { IncomingHttpHeaders } from "http";
import { AsyncContext, AsyncRowStore } from "../store/AsyncRowStore";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OpRecord } from "./Entity";
import { OakException } from "./Exception";
export interface Connector<ED extends EntityDict, BackCxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>> {
    callAspect: (name: string, params: any, context: FrontCxt) => Promise<{
        result: any;
        opRecords?: OpRecord<ED>[];
        message?: string | null;
    }>;
    getRouter: () => string;
    parseRequest: (headers: IncomingHttpHeaders, body: any, store: AsyncRowStore<ED, BackCxt>) => Promise<{
        name: string;
        params: any;
        context: BackCxt;
    }>;
    serializeResult: (result: any, context: BackCxt, headers: IncomingHttpHeaders, body: any) => Promise<{
        body: any;
        headers?: Record<string, any>;
    }>;
    serializeException: (exception: OakException<ED>, headers: IncomingHttpHeaders, body: any) => {
        body: any;
        headers?: Record<string, any>;
    };
    getSubscribeRouter: () => string;
    getSubscribePoint: () => Promise<{
        url: string;
        path: string;
    }>;
    getBridgeRouter: () => string;
    makeBridgeUrl: (url: string, headers?: Record<string, string>) => string;
    parseBridgeRequestQuery: (urlParams: string) => {
        url: string;
        headers?: Record<string, string>;
    };
}
