import assert from 'assert';
import { IncomingHttpHeaders } from "http";
import { Stream } from 'stream';
import URL from 'url';
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

type ServerOption = {
    protocol: string;
    hostname: string;
    port?: number;
    apiPath?: string;
};

export class SimpleConnector<ED extends EntityDict, FrontCxt extends SyncContext<ED>> implements Connector<ED, FrontCxt> {
    static ASPECT_ROUTER = '/aspect';
    static BRIDGE_ROUTER = '/bridge';
    static SUBSCRIBE_ROUTER = '/subscribe';
    static SUBSCRIBE_POINT_ROUTER = '/subscribePoint';
    private serverAspectUrl: string;
    private serverBridgeUrl: string;
    private serverSubscribePointUrl: string;
    private option: ServerOption;
    private makeException: (exceptionData: any) => OakException<ED>;

    constructor(option: ServerOption, makeException: (exceptionData: any) => OakException<ED>) {
        this.option = option;
        const { protocol, hostname, port, apiPath } = option;
        let serverUrl = `${protocol}//${hostname}`;
        if (typeof port === 'number') {
            serverUrl += `:${port}`;
        }
        if (apiPath) {
            assert(apiPath.startsWith('/'));
            serverUrl += apiPath;
        }
        this.serverAspectUrl = `${serverUrl}${SimpleConnector.ASPECT_ROUTER}`;
        this.serverBridgeUrl = `${serverUrl}${SimpleConnector.BRIDGE_ROUTER}`;
        this.serverSubscribePointUrl = `${serverUrl}${SimpleConnector.SUBSCRIBE_POINT_ROUTER}`;
        this.makeException = makeException;
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

    getSubscribeRouter(): string {
        return SimpleConnector.SUBSCRIBE_ROUTER;
    }

    getSubscribePointRouter():  string {
        return SimpleConnector.SUBSCRIBE_POINT_ROUTER;
    }

    async getSubscribePoint() {
        const response = await global.fetch(this.serverSubscribePointUrl);
        if (response.status > 299) {
            const err = new OakExternalException(`网络请求返回异常，status是${response.status}`);
            throw err;
        }

        const message = response.headers.get('oak-message');
        const responseType = response.headers.get('Content-Type') || response.headers.get('content-type');
        if (responseType?.toLocaleLowerCase().match(/application\/json/i)) {
            const {
                url,
                path,
                port,
            } = await response.json();

            let url2 = url || `${this.option.protocol}//${this.option.hostname}`;
            assert(port);
            url2 += `:${port}`;

            return {
                url: url2,
                path,
            };
        }
        else {
            throw new Error(`尚不支持的content-type类型${responseType}`);
        }
    }

    parseRequestHeaders(headers: IncomingHttpHeaders) {
        const { 'oak-cxt': oakCxtStr, 'oak-aspect': aspectName } = headers;
        assert(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
        assert(typeof aspectName === 'string');
        return {
            contextString: oakCxtStr,
            aspectName,
        }
    }

    async serializeResult(result: any, opRecords: OpRecord<ED>[], headers: IncomingHttpHeaders, body: any, message?: string): Promise<{ body: any; headers?: Record<string, any> | undefined; }> {
        if (result instanceof Stream || result instanceof Buffer) {
            return {
                body: result,
                headers: {
                    'oak-message': message,
                },
            };
        }

        return {
            body: {
                result,
                opRecords,
            },
            headers: {
                'oak-message': message,
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
