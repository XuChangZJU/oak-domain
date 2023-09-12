/// <reference types="node" />
import { IncomingHttpHeaders } from "http";
import { SyncContext } from '../store/SyncRowStore';
import { Connector, EntityDict, OakException, OpRecord } from "../types";
type ServerOption = {
    protocol: string;
    hostname: string;
    port?: number;
    apiPath?: string;
};
export declare class SimpleConnector<ED extends EntityDict, FrontCxt extends SyncContext<ED>> implements Connector<ED, FrontCxt> {
    static ASPECT_ROUTER: string;
    static BRIDGE_ROUTER: string;
    static SUBSCRIBE_ROUTER: string;
    static SUBSCRIBE_POINT_ROUTER: string;
    private serverAspectUrl;
    private serverBridgeUrl;
    private serverSubscribePointUrl;
    private option;
    private makeException;
    constructor(option: ServerOption, makeException: (exceptionData: any) => OakException<ED>);
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
    getSubscribeRouter(): string;
    getSubscribePointRouter(): string;
    getSubscribePoint(): Promise<{
        url: any;
        path: any;
    }>;
    parseRequestHeaders(headers: IncomingHttpHeaders): {
        contextString: string | undefined;
        aspectName: string;
    };
    serializeResult(result: any, opRecords: OpRecord<ED>[], headers: IncomingHttpHeaders, body: any, message?: string): Promise<{
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
export {};
