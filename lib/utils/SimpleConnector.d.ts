/// <reference types="node" />
import { IncomingHttpHeaders } from "http";
import { AsyncContext, AsyncRowStore } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';
import { Connector, EntityDict, OakException } from "../types";
export declare class SimpleConnector<ED extends EntityDict, BackCxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>> extends Connector<ED, BackCxt, FrontCxt> {
    static ASPECT_ROUTER: string;
    static BRIDGE_ROUTER: string;
    private serverAspectUrl;
    private serverBridgeUrl;
    private makeException;
    private contextBuilder;
    constructor(serverUrl: string, makeException: (exceptionData: any) => OakException<ED>, contextBuilder: (str: string | undefined) => (store: AsyncRowStore<ED, BackCxt>) => Promise<BackCxt>);
    callAspect(name: string, params: any, context: FrontCxt): Promise<{
        result: any;
        opRecords: any;
        message: string | null;
    } | {
        result: ArrayBuffer;
        message: string | null;
        opRecords?: undefined;
    }>;
    getRouter(): string;
    parseRequest(headers: IncomingHttpHeaders, body: any, store: AsyncRowStore<ED, BackCxt>): Promise<{
        name: string;
        params: any;
        context: BackCxt;
    }>;
    serializeResult(result: any, context: BackCxt, headers: IncomingHttpHeaders, body: any): Promise<{
        body: any;
        headers?: Record<string, any> | undefined;
    }>;
    serializeException(exception: OakException<ED>, headers: IncomingHttpHeaders, body: any): {
        body: any;
        headers?: Record<string, any> | undefined;
    };
    getBridgeRouter(): string;
    /**
     * 通过本地服务器桥接访问外部资源的url
     * @param url
     * @param headers
     */
    makeBridgeUrl(url: string, headers?: Record<string, string>): string;
    parseBridgeRequestQuery(urlParams: string): {
        url: string;
        headers?: Record<string, string> | undefined;
    };
}
