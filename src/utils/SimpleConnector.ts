import assert from 'assert';
import { IncomingHttpHeaders } from "http";
import { UniversalContext } from "../store/UniversalContext";
import { Connector, EntityDict, OakException, OakExternalException, OpRecord, RowStore } from "../types";

function makeContentTypeAndBody(data: any) {
    return {
        contentType: 'application/json',
        body: JSON.stringify(data),
    };
}

export class SimpleConnector<ED extends EntityDict, Cxt extends UniversalContext<ED>> extends Connector<ED, Cxt> {
    static ROUTER = '/aspect';
    private serverUrl: string;
    private makeException: (exceptionData: any) => OakException;
    private contextBuilder: (str: string | undefined) => (store: RowStore<ED, Cxt>) => Promise<Cxt>;

    constructor(serverUrl: string, makeException: (exceptionData: any) => OakException, contextBuilder: (str: string | undefined) => (store: RowStore<ED, Cxt>) => Promise<Cxt>) {
        super();
        this.serverUrl = `${serverUrl}${SimpleConnector.ROUTER}`;
        this.makeException = makeException;
        this.contextBuilder = contextBuilder;
    }

    async callAspect(name: string, params: any, context: Cxt): Promise<{ result: any; opRecords: OpRecord<ED>[]; }> {
        const cxtStr = await context.toString();

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

    async parseRequest(headers: IncomingHttpHeaders, body: any, store: RowStore<ED, Cxt>) {        
        const { 'oak-cxt': oakCxtStr, 'oak-aspect': aspectName } = headers;
        assert(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
        assert(typeof aspectName === 'string');
        const context = await this.contextBuilder(oakCxtStr as string | undefined)(store);
        return {
            name: aspectName,
            params: body,
            context,
        };
    }
    
    serializeResult(result: any, context: Cxt, headers: IncomingHttpHeaders, body: any): { body: any; headers?: Record<string, any> | undefined; } {
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