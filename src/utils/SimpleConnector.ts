import assert from 'assert';
import { IncomingHttpHeaders } from "http";
import { AsyncContext, AsyncRowStore } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';
import { Connector, EntityDict, OakException, OakExternalException, OpRecord } from "../types";

function makeContentTypeAndBody(data: any) {
    return {
        contentType: 'application/json',
        body: JSON.stringify(data),
    };
}

export class SimpleConnector<ED extends EntityDict, BackCxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>> extends Connector<ED, BackCxt, FrontCxt> {
    static ROUTER = '/aspect';
    private serverUrl: string;
    private makeException: (exceptionData: any) => OakException;
    private contextBuilder: (str: string | undefined) => (store: AsyncRowStore<ED, BackCxt>) => Promise<BackCxt>;

    constructor(serverUrl: string, makeException: (exceptionData: any) => OakException, contextBuilder: (str: string | undefined) => (store: AsyncRowStore<ED, BackCxt>) => Promise<BackCxt>) {
        super();
        this.serverUrl = `${serverUrl}${SimpleConnector.ROUTER}`;
        this.makeException = makeException;
        this.contextBuilder = contextBuilder;
    }

    async callAspect(name: string, params: any, context: FrontCxt): Promise<{ result: any; opRecords: OpRecord<ED>[]; }> {
        const cxtStr = context.toString();

        const { contentType, body } = makeContentTypeAndBody(params);
        const response = await global.fetch(this.serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'oak-cxt': cxtStr,
                'oak-aspect': name as string,
            },
            body,
        });
        if (response.status > 299) {
            const err = new OakExternalException(`网络请求返回异常，status是${response.status}`);
            throw err;
        }

        // todo 处理各种返回的格式
        const {
            exception,
            result,
            opRecords
        } = await response.json();

        if (exception) {
            throw this.makeException(exception);
        }
        return {
            result,
            opRecords,
        };
    }

    getRouter(): string {
        return SimpleConnector.ROUTER;
    }

    async parseRequest(headers: IncomingHttpHeaders, body: any, store: AsyncRowStore<ED, BackCxt>): Promise<{ name: string; params: any; context: BackCxt; }> {        
        const { 'oak-cxt': oakCxtStr, 'oak-aspect': aspectName } = headers;
        assert(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
        assert(typeof aspectName === 'string');
        const context = await this.contextBuilder(oakCxtStr as string | undefined)(store);
        context.setHeaders(headers);
        return {
            name: aspectName,
            params: body,
            context,
        };
    }
    
    serializeResult(result: any, context: BackCxt, headers: IncomingHttpHeaders, body: any): { body: any; headers?: Record<string, any> | undefined; } {
        return {
            body: {
                result,
                opRecords: context.opRecords,
            },
        };
    }

    serializeException(exception: OakException, headers: IncomingHttpHeaders, body: any): { body: any; headers?: Record<string, any> | undefined; } {        
        return {
            body: {
                exception: exception.toString(),
            },
        };
    }
}