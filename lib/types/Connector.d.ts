/// <reference types="node" />
import { IncomingHttpHeaders } from "http";
import { SyncContext } from "../store/SyncRowStore";
import { EntityDict, OpRecord } from "./Entity";
import { OakException } from "./Exception";
export interface Connector<ED extends EntityDict, FrontCxt extends SyncContext<ED>> {
    callAspect: (name: string, params: any, context?: FrontCxt) => Promise<{
        result: any;
        opRecords?: OpRecord<ED>[];
        message?: string | null;
    }>;
    getRouter: () => string;
    parseRequest: (headers: IncomingHttpHeaders, body?: any, files?: any) => {
        contextString?: string;
        aspectName: string;
        data?: any;
    };
    serializeResult: (result: any, opRecords: OpRecord<ED>[], headers: IncomingHttpHeaders, body: any, message?: string) => Promise<{
        body: any;
        headers?: Record<string, any>;
    }>;
    serializeException: (exception: OakException<ED>, headers: IncomingHttpHeaders, body: any) => {
        body: any;
        headers?: Record<string, any>;
    };
    getSubscribeRouter: () => string;
    getSubscribePointRouter: () => string;
    getSubscribePoint: () => Promise<{
        url: string;
        path: string;
    }>;
    getBridgeRouter: () => string;
    makeBridgeUrl: (url: string, headers?: Record<string, string>) => string;
    getEndpointRouter: () => string;
    parseBridgeRequestQuery: (urlParams: string) => {
        url: string;
        headers?: Record<string, string>;
    };
}
