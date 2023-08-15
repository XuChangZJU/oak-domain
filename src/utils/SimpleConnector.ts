import assert from 'assert';
import { IncomingHttpHeaders } from "http";
import { Stream } from 'stream';
import URL from 'url';
import { AsyncContext, AsyncRowStore } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';
import { Connector, EntityDict, OakException, OakExternalException, OpRecord } from "../types";

function makeContentTypeAndBody(data: any) {
    //
    if (process.env.OAK_PLATFORM !== 'wechatMp') {
        if (data instanceof FormData) {
            return {
                // contentType: 'multipart/form-data',
                body: data,
            };
        }
    }

    return {
        contentType: 'application/json',
        body: JSON.stringify(data),
    };
}

export class SimpleConnector<ED extends EntityDict, BackCxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>> extends Connector<ED, BackCxt, FrontCxt> {
    static ASPECT_ROUTER = '/aspect';
    static BRIDGE_ROUTER = '/bridge';
    private serverAspectUrl: string;
    private serverBridgeUrl: string;
    private makeException: (exceptionData: any) => OakException<ED>;
    private contextBuilder: (str: string | undefined) => (store: AsyncRowStore<ED, BackCxt>) => Promise<BackCxt>;

    constructor(serverUrl: string, makeException: (exceptionData: any) => OakException<ED>, contextBuilder: (str: string | undefined) => (store: AsyncRowStore<ED, BackCxt>) => Promise<BackCxt>) {
        super();
        this.serverAspectUrl = `${serverUrl}${SimpleConnector.ASPECT_ROUTER}`;
        this.serverBridgeUrl = `${serverUrl}${SimpleConnector.BRIDGE_ROUTER}`;
        this.makeException = makeException;
        this.contextBuilder = contextBuilder;
    }

    async callAspect(name: string, params: any, context: FrontCxt) {
        const cxtStr = context.toString();

        const { contentType, body } = makeContentTypeAndBody(params);
        const response = await global.fetch(this.serverAspectUrl, {
            method: 'POST',
            headers: Object.assign(
                {
                    'oak-cxt': cxtStr,
                    'oak-aspect': name as string,
                },
                contentType && {
                    'Content-Type': contentType as string,
                }
            ) as RequestInit['headers'],
            body,
        });
        if (response.status > 299) {
            const err = new OakExternalException(`网络请求返回异常，status是${response.status}`);
            throw err;
        }

        const message = response.headers.get('oak-message');
        const responseType = response.headers.get('Content-Type') || response.headers.get('content-type');
        if (responseType?.toLocaleLowerCase().match(/application\/json/i)) {
            const {
                exception,
                result,
                opRecords,
            } = await response.json();

            if (exception) {
                throw this.makeException(exception);
            }
            return {
                result,
                opRecords,
                message,
            };
        }
        else if (responseType?.toLocaleLowerCase().match(/application\/octet-stream/i)) {
            const result = await response.arrayBuffer();
            return {
                result,
                message,
            };
        }
        else {
            throw new Error(`尚不支持的content-type类型${responseType}`);
        }
    }

    getRouter(): string {
        return SimpleConnector.ASPECT_ROUTER;
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

    async serializeResult(result: any, context: BackCxt, headers: IncomingHttpHeaders, body: any): Promise<{ body: any; headers?: Record<string, any> | undefined; }> {
        if (result instanceof Stream || result instanceof Buffer) {
            return {
                body: result,
            };
        }

        await context.refineOpRecords();
        return {
            body: {
                result,
                opRecords: context.opRecords,
            },
            headers: {
                'oak-message': context.getMessage(),
            },
        };
    }

    serializeException(exception: OakException<ED>, headers: IncomingHttpHeaders, body: any): { body: any; headers?: Record<string, any> | undefined; } {
        return {
            body: {
                exception: exception.toString(),
            },
        };
    }

    getBridgeRouter(): string {
        return SimpleConnector.BRIDGE_ROUTER;
    }

    /**
     * 通过本地服务器桥接访问外部资源的url
     * @param url 
     * @param headers 
     */
    makeBridgeUrl(url: string, headers?: Record<string, string>) {
        // if (process.env.PROD !== 'true') {
        //     console.warn('在development下无法通过bridge访问资源，将直接访问，可能失败', url);
        //     return url;
        // }
        const encodeUrl = encodeURIComponent(url);
        // const urlParse = URL.parse(url, true);
        // const { search } = urlParse as {
        //     search: string;
        // };
        // if (headers) {
        //     search.append('headers', JSON.stringify(headers));
        // }

        return `${this.serverBridgeUrl}?url=${encodeUrl}`;
    }
    parseBridgeRequestQuery(urlParams: string): { url: string; headers?: Record<string, string> | undefined; } {
        const search = new URL.URLSearchParams(urlParams);
        const url = search.get('url') as string;
        const headers = search.get('headers');
        return {
            url,
            headers: headers && JSON.parse(headers),
        };
    }
}
