"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleConnector = void 0;
const assert_1 = __importDefault(require("assert"));
const types_1 = require("../types");
function makeContentTypeAndBody(data) {
    return {
        contentType: 'application/json',
        body: JSON.stringify(data),
    };
}
class SimpleConnector extends types_1.Connector {
    static ROUTER = '/aspect';
    serverUrl;
    makeException;
    contextBuilder;
    constructor(serverUrl, makeException, contextBuilder) {
        super();
        this.serverUrl = `${serverUrl}${SimpleConnector.ROUTER}`;
        this.makeException = makeException;
        this.contextBuilder = contextBuilder;
    }
    async callAspect(name, params, context) {
        const cxtStr = await context.toString();
        const { contentType, body } = makeContentTypeAndBody(params);
        const response = await global.fetch(this.serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'oak-cxt': cxtStr,
                'oak-aspect': name,
            },
            body,
        });
        if (response.status > 299) {
            const err = new types_1.OakExternalException(`网络请求返回异常，status是${response.status}`);
            throw err;
        }
        // todo 处理各种返回的格式
        const { exception, result, opRecords } = await response.json();
        if (exception) {
            throw this.makeException(exception);
        }
        return {
            result,
            opRecords,
        };
    }
    getRouter() {
        return SimpleConnector.ROUTER;
    }
    parseRequest(headers, body, store) {
        const { 'oak-cxt': oakCxtStr, 'oak-aspect': aspectName } = headers;
        (0, assert_1.default)(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
        (0, assert_1.default)(typeof aspectName === 'string');
        const context = this.contextBuilder(oakCxtStr)(store);
        return {
            name: aspectName,
            params: body,
            context,
        };
    }
    serializeResult(result, context, headers, body) {
        return {
            body: {
                result,
                opRecords: context.opRecords,
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
}
exports.SimpleConnector = SimpleConnector;
