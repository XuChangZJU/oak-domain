"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleConnector = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var stream_1 = require("stream");
var url_1 = tslib_1.__importDefault(require("url"));
var types_1 = require("../types");
function makeContentTypeAndBody(data) {
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
var SimpleConnector = /** @class */ (function (_super) {
    tslib_1.__extends(SimpleConnector, _super);
    function SimpleConnector(serverUrl, makeException, contextBuilder) {
        var _this = _super.call(this) || this;
        _this.serverAspectUrl = "".concat(serverUrl).concat(SimpleConnector.ASPECT_ROUTER);
        _this.serverBridgeUrl = "".concat(serverUrl).concat(SimpleConnector.BRIDGE_ROUTER);
        _this.makeException = makeException;
        _this.contextBuilder = contextBuilder;
        return _this;
    }
    SimpleConnector.prototype.callAspect = function (name, params, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var cxtStr, _a, contentType, body, response, err, message, responseType, _b, exception, result, opRecords, result;
            return tslib_1.__generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        cxtStr = context.toString();
                        _a = makeContentTypeAndBody(params), contentType = _a.contentType, body = _a.body;
                        return [4 /*yield*/, global.fetch(this.serverAspectUrl, {
                            method: 'POST',
                            headers: Object.assign({
                                'oak-cxt': cxtStr,
                                'oak-aspect': name,
                            }, contentType && {
                                'Content-Type': contentType,
                            }),
                            body: body,
                        })];
                    case 1:
                        response = _c.sent();
                        if (response.status > 299) {
                            err = new types_1.OakExternalException("\u7F51\u7EDC\u8BF7\u6C42\u8FD4\u56DE\u5F02\u5E38\uFF0Cstatus\u662F".concat(response.status));
                            throw err;
                        }
                        message = response.headers.get('oak-message');
                        responseType = response.headers.get('Content-Type') || response.headers.get('content-type');
                        if (!(responseType === null || responseType === void 0 ? void 0 : responseType.toLocaleLowerCase().match(/application\/json/i))) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        _b = _c.sent(), exception = _b.exception, result = _b.result, opRecords = _b.opRecords;
                        if (exception) {
                            throw this.makeException(exception);
                        }
                        return [2 /*return*/, {
                            result: result,
                            opRecords: opRecords,
                            message: message,
                        }];
                    case 3:
                        if (!(responseType === null || responseType === void 0 ? void 0 : responseType.toLocaleLowerCase().match(/application\/octet-stream/i))) return [3 /*break*/, 5];
                        return [4 /*yield*/, response.arrayBuffer()];
                    case 4:
                        result = _c.sent();
                        return [2 /*return*/, {
                            result: result,
                            message: message,
                        }];
                    case 5: throw new Error("\u5C1A\u4E0D\u652F\u6301\u7684content-type\u7C7B\u578B".concat(responseType));
                }
            });
        });
    };
    SimpleConnector.prototype.getRouter = function () {
        return SimpleConnector.ASPECT_ROUTER;
    };
    SimpleConnector.prototype.getSubscribeRouter = function () {
        return SimpleConnector.SUBSCRIBE_ROUTER;
    };
    SimpleConnector.prototype.parseRequest = function (headers, body, store) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var oakCxtStr, aspectName, context;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oakCxtStr = headers["oak-cxt"], aspectName = headers["oak-aspect"];
                        (0, assert_1.default)(typeof oakCxtStr === 'string' || oakCxtStr === undefined);
                        (0, assert_1.default)(typeof aspectName === 'string');
                        return [4 /*yield*/, this.contextBuilder(oakCxtStr)(store)];
                    case 1:
                        context = _a.sent();
                        context.setHeaders(headers);
                        return [2 /*return*/, {
                            name: aspectName,
                            params: body,
                            context: context,
                        }];
                }
            });
        });
    };
    SimpleConnector.prototype.serializeResult = function (result, context, headers, body) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (result instanceof stream_1.Stream || result instanceof Buffer) {
                            return [2 /*return*/, {
                                body: result,
                            }];
                        }
                        return [4 /*yield*/, context.refineOpRecords()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {
                            body: {
                                result: result,
                                opRecords: context.opRecords,
                            },
                            headers: {
                                'oak-message': context.getMessage(),
                            },
                        }];
                }
            });
        });
    };
    SimpleConnector.prototype.serializeException = function (exception, headers, body) {
        return {
            body: {
                exception: exception.toString(),
            },
        };
    };
    SimpleConnector.prototype.getBridgeRouter = function () {
        return SimpleConnector.BRIDGE_ROUTER;
    };
    /**
     * 通过本地服务器桥接访问外部资源的url
     * @param url
     * @param headers
     */
    SimpleConnector.prototype.makeBridgeUrl = function (url, headers) {
        // if (process.env.PROD !== 'true') {
        //     console.warn('在development下无法通过bridge访问资源，将直接访问，可能失败', url);
        //     return url;
        // }
        var encodeUrl = encodeURIComponent(url);
        // const urlParse = URL.parse(url, true);
        // const { search } = urlParse as {
        //     search: string;
        // };
        // if (headers) {
        //     search.append('headers', JSON.stringify(headers));
        // }
        return "".concat(this.serverBridgeUrl, "?url=").concat(encodeUrl);
    };
    SimpleConnector.prototype.parseBridgeRequestQuery = function (urlParams) {
        var search = new url_1.default.URLSearchParams(urlParams);
        var url = search.get('url');
        var headers = search.get('headers');
        return {
            url: url,
            headers: headers && JSON.parse(headers),
        };
    };
    SimpleConnector.ASPECT_ROUTER = '/aspect';
    SimpleConnector.BRIDGE_ROUTER = '/bridge';
    SimpleConnector.SUBSCRIBE_ROUTER = '/subscribe';
    return SimpleConnector;
}(types_1.Connector));
exports.SimpleConnector = SimpleConnector;
