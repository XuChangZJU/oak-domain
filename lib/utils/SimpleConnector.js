"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleConnector = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const stream_1 = require("stream");
const url_1 = tslib_1.__importDefault(require("url"));
const types_1 = require("../types");
function makeContentTypeAndBody(data) {
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
class SimpleConnector {
    static ASPECT_ROUTER = '/aspect';
    static BRIDGE_ROUTER = '/bridge';
    static SUBSCRIBE_ROUTER = process.env.OAK_SUBSCRIBE_ROUTER || '/subscribe';
    static SUBSCRIBE_POINT_ROUTER = '/subscribePoint';
    static ENDPOINT_ROUTER = '/endpoint';
    serverAspectUrl;
    serverBridgeUrl;
    serverSubscribePointUrl;
    option;
    makeException;
    constructor(option, makeException) {
        this.option = option;
        const { protocol, hostname, port, apiPath } = option;
        let serverUrl = `${protocol}//${hostname}`;
        if (typeof port === 'number') {
            serverUrl += `:${port}`;
        }
        if (apiPath) {
            (0, assert_1.default)(apiPath.startsWith('/'), 'apiPath前缀必须存在/');
            serverUrl += apiPath;
        }
        this.serverAspectUrl = `${serverUrl}${SimpleConnector.ASPECT_ROUTER}`;
        this.serverBridgeUrl = `${serverUrl}${SimpleConnector.BRIDGE_ROUTER}`;
        this.serverSubscribePointUrl = `${serverUrl}${SimpleConnector.SUBSCRIBE_POINT_ROUTER}`;
        this.makeException = makeException;
    }
    async callAspect(name, params, context) {
        const cxtStr = context ? await context.toString() : '{}';
        const { contentType, body } = makeContentTypeAndBody(params);
        let response;
        try {
            response = await global.fetch(this.serverAspectUrl, {
                method: 'POST',
                headers: Object.assign({
                    'oak-cxt': cxtStr,
                    'oak-aspect': name,
                }, contentType && {
                    'Content-Type': contentType,
                }),
                body,
            });
        }
        catch (err) {
            // fetch返回异常一定是网络异常
            throw new types_1.OakNetworkException(`请求[${this.serverAspectUrl}]，发生网络异常`);
        }
        if (response.status > 299) {
            const err = new types_1.OakServerProxyException(`网络请求返回status是${response.status}`);
            throw err;
        }
        const message = response.headers.get('oak-message');
        const responseType = response.headers.get('Content-Type') ||
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
        }
        else if (responseType
            ?.toLocaleLowerCase()
            .match(/application\/octet-stream/i)) {
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
    getRouter() {
        return SimpleConnector.ASPECT_ROUTER;
    }
    getSubscribeRouter() {
        return SimpleConnector.SUBSCRIBE_ROUTER;
    }
    getSubscribePointRouter() {
        return SimpleConnector.SUBSCRIBE_POINT_ROUTER;
    }
    async getSubscribePoint() {
        let response;
        try {
            response = await global.fetch(this.serverSubscribePointUrl);
        }
        catch (err) {
            throw new types_1.OakNetworkException();
        }
        if (response.status > 299) {
            const err = new types_1.OakServerProxyException(`网络请求返回status是${response.status}`);
            throw err;
        }
        const message = response.headers.get('oak-message');
        const responseType = response.headers.get('Content-Type') ||
            response.headers.get('content-type');
        if (responseType?.toLocaleLowerCase().match(/application\/json/i)) {
            const { url, path, port, namespace } = await response.json();
            let url2 = url || `${this.option.protocol}//${this.option.hostname}`;
            (0, assert_1.default)(port);
            url2 += `:${port}`;
            if (namespace) {
                url2 += namespace;
            }
            return {
                url: url2,
                path,
            };
        }
        else {
            throw new Error(`尚不支持的content-type类型${responseType}`);
        }
    }
    getEndpointRouter() {
        return SimpleConnector.ENDPOINT_ROUTER;
    }
    parseRequestHeaders(headers) {
        const { 'oak-cxt': oakCxtStr, 'oak-aspect': aspectName } = headers;
        (0, assert_1.default)(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
        (0, assert_1.default)(typeof aspectName === 'string');
        return {
            contextString: oakCxtStr,
            aspectName,
        };
    }
    async serializeResult(result, opRecords, headers, body, message) {
        if (result instanceof stream_1.Stream || result instanceof Buffer) {
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
    serializeException(exception, headers, body) {
        return {
            body: {
                exception: exception.toString(),
            },
        };
    }
    getBridgeRouter() {
        return SimpleConnector.BRIDGE_ROUTER;
    }
    /**
     * 通过本地服务器桥接访问外部资源的url
     * @param url
     * @param headers
     */
    makeBridgeUrl(url, headers) {
        // if (process.env.PROD !== 'true') {
        //     console.warn('在development下无法通过bridge访问资源，将直接访问，可能失败', url);
        //     return url;
        // }
        const encodeUrl = encodeURIComponent(url);
        return `${this.serverBridgeUrl}?url=${encodeUrl}`;
    }
    parseBridgeRequestQuery(urlParams) {
        const search = new url_1.default.URLSearchParams(urlParams);
        const url = search.get('url');
        const headers = search.get('headers');
        return {
            url,
            headers: headers && JSON.parse(headers),
        };
    }
}
exports.SimpleConnector = SimpleConnector;
