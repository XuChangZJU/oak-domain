import assert from 'assert';
import { IncomingHttpHeaders } from "http";
import { Stream } from 'stream';
import URL from 'url';
import { SyncContext } from '../store/SyncRowStore';
import { Connector, EntityDict, OakException, OakNetworkException, OakServerProxyException, OpRecord } from "../types";

type ServerOption = {
    protocol: string;
    hostname: string;
    port?: number;
    apiPath?: string;
};

export class SimpleConnector<ED extends EntityDict, FrontCxt extends SyncContext<ED>>
    implements Connector<ED, FrontCxt>
{
    static ASPECT_ROUTER = '/aspect';
    static BRIDGE_ROUTER = '/bridge';
    static SUBSCRIBE_ROUTER = process.env.OAK_SUBSCRIBE_ROUTER || '/subscribe';
    static SUBSCRIBE_POINT_ROUTER = '/subscribePoint';
    static ENDPOINT_ROUTER = '/endpoint';
    private serverAspectUrl: string;
    private serverBridgeUrl: string;
    private serverSubscribePointUrl: string;
    private option: ServerOption;
    private makeException: (exceptionData: any) => OakException<ED>;

    constructor(
        option: ServerOption,
        makeException: (exceptionData: any) => OakException<ED>
    ) {
        this.option = option;
        const { protocol, hostname, port, apiPath } = option;
        let serverUrl = `${protocol}//${hostname}`;
        if (typeof port === 'number') {
            serverUrl += `:${port}`;
        }
        if (apiPath) {
            assert(apiPath.startsWith('/'), 'apiPath前缀必须存在/');
            serverUrl += apiPath;
        }
        this.serverAspectUrl = `${serverUrl}${SimpleConnector.ASPECT_ROUTER}`;
        this.serverBridgeUrl = `${serverUrl}${SimpleConnector.BRIDGE_ROUTER}`;
        this.serverSubscribePointUrl = `${serverUrl}${SimpleConnector.SUBSCRIBE_POINT_ROUTER}`;
        this.makeException = makeException;
    }

    protected async makeHeadersAndBody(name: string, data: any, context?: FrontCxt) {
        const cxtStr = context ? await context.toString() : '{}';
        const headers: HeadersInit = {
            'oak-cxt': cxtStr,
            'oak-aspect': name,
        };
        if (process.env.OAK_PLATFORM !== 'wechatMp') {
            if (data instanceof FormData) {
                return {
                    headers,
                    body: data,
                };
            }
        }

        return {
            headers: {                
                'Content-Type': 'application/json',
                ...headers,
            } as HeadersInit,
            body: JSON.stringify(data),
        };
    };

    protected async parseAspectResult(response: Response) {
        if (response.status > 299) {
            const err = new OakServerProxyException(
                `网络请求返回status是${response.status}`
            );
            throw err;
        }

        const message = response.headers.get('oak-message');
        const responseType =
            response.headers.get('Content-Type') ||
            response.headers.get('content-type');
        if (responseType?.toLocaleLowerCase().match(/application\/json/i)) {
            const { exception, result, opRecords } = await response.json();

            if (exception) {
                throw this.makeException(exception);
            }
            return {
                result,
                opRecords,
                message,
            };
        } else if (
            responseType
                ?.toLocaleLowerCase()
                .match(/application\/octet-stream/i)
        ) {
            const result = await response.arrayBuffer();
            return {
                result,
                message,
            };
        } else {
            throw new Error(`尚不支持的content-type类型${responseType}`);
        }

    }

    async callAspect(name: string, params: any, context?: FrontCxt) {
        const { headers, body } = await this.makeHeadersAndBody(name, params, context);
        let response: Response;
        try {
            response = await global.fetch(this.serverAspectUrl, {
                method: 'POST',
                headers,
                body,
            });
        } catch (err) {
            // fetch返回异常一定是网络异常
            throw new OakNetworkException(`请求[${this.serverAspectUrl}]，发生网络异常`);
        }

        return this.parseAspectResult(response);
    }

    getRouter(): string {
        return SimpleConnector.ASPECT_ROUTER;
    }

    getSubscribeRouter(): string {
        return SimpleConnector.SUBSCRIBE_ROUTER;
    }

    getSubscribePointRouter(): string {
        return SimpleConnector.SUBSCRIBE_POINT_ROUTER;
    }

    async getSubscribePoint() {
        let response: Response;
        try {
            response = await global.fetch(this.serverSubscribePointUrl);
        } catch (err) {
            throw new OakNetworkException();
        }

        if (response.status > 299) {
            const err = new OakServerProxyException(
                `网络请求返回status是${response.status}`
            );
            throw err;
        }

        const message = response.headers.get('oak-message');
        const responseType =
            response.headers.get('Content-Type') ||
            response.headers.get('content-type');
        if (responseType?.toLocaleLowerCase().match(/application\/json/i)) {
            const { url, path, port, namespace } = await response.json();

            let url2 =
                url || `${this.option.protocol}//${this.option.hostname}`;
            assert(port);
            url2 += `:${port}`;
            if (namespace) {
                url2 += namespace;
            }

            return {
                url: url2,
                path,
            };
        } else {
            throw new Error(`尚不支持的content-type类型${responseType}`);
        }
    }

    getEndpointRouter(): string {
        return SimpleConnector.ENDPOINT_ROUTER;
    }

    parseRequest(headers: IncomingHttpHeaders, body?: any, files?: any) {
        const { 'oak-cxt': oakCxtStr, 'oak-aspect': aspectName } = headers;
        assert(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
        assert(typeof aspectName === 'string');
        return {
            contextString: oakCxtStr,
            aspectName,
           /*  data: !files ? body : {
                data: body,
                files,
            }, */   // 下个版本再改
            data: files ? Object.assign({}, body, files) : body,
        };
    }

    async serializeResult(
        result: any,
        opRecords: OpRecord<ED>[],
        headers: IncomingHttpHeaders,
        body: any,
        message?: string
    ): Promise<{ body: any; headers?: Record<string, any> | undefined }> {
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

    serializeException(
        exception: OakException<ED>,
        headers: IncomingHttpHeaders,
        body: any
    ): { body: any; headers?: Record<string, any> | undefined } {
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

        return `${this.serverBridgeUrl}?url=${encodeUrl}`;
    }

    parseBridgeRequestQuery(urlParams: string): {
        url: string;
        headers?: Record<string, string> | undefined;
    } {
        const search = new URL.URLSearchParams(urlParams);
        const url = search.get('url') as string;
        const headers = search.get('headers');
        return {
            url,
            headers: headers && JSON.parse(headers),
        };
    }
}
