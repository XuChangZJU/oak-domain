"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleConnector = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var stream_1 = require("stream");
var types_1 = require("../types");
function makeContentTypeAndBody(data) {
    //
    if (process.env.OAK_PLATFORM !== 'wechatMp') {
        if (data instanceof FormData) {
            return {
                contentType: 'multipart/form-data',
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
        _this.serverUrl = "".concat(serverUrl).concat(SimpleConnector.ROUTER);
        _this.makeException = makeException;
        _this.contextBuilder = contextBuilder;
        return _this;
    }
    SimpleConnector.prototype.callAspect = function (name, params, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var cxtStr, _a, contentType, body, response, err, _b, exception, result, opRecords;
            return tslib_1.__generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        cxtStr = context.toString();
                        _a = makeContentTypeAndBody(params), contentType = _a.contentType, body = _a.body;
                        return [4 /*yield*/, global.fetch(this.serverUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': contentType,
                                    'oak-cxt': cxtStr,
                                    'oak-aspect': name,
                                },
                                body: body,
                            })];
                    case 1:
                        response = _c.sent();
                        if (response.status > 299) {
                            err = new types_1.OakExternalException("\u7F51\u7EDC\u8BF7\u6C42\u8FD4\u56DE\u5F02\u5E38\uFF0Cstatus\u662F".concat(response.status));
                            throw err;
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        _b = _c.sent(), exception = _b.exception, result = _b.result, opRecords = _b.opRecords;
                        if (exception) {
                            throw this.makeException(exception);
                        }
                        return [2 /*return*/, {
                                result: result,
                                opRecords: opRecords,
                            }];
                }
            });
        });
    };
    SimpleConnector.prototype.getRouter = function () {
        return SimpleConnector.ROUTER;
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
        if (result instanceof stream_1.Stream) {
            return {
                body: result,
            };
        }
        return {
            body: {
                result: result,
                opRecords: context.opRecords,
            },
        };
    };
    SimpleConnector.prototype.serializeException = function (exception, headers, body) {
        return {
            body: {
                exception: exception.toString(),
            },
        };
    };
    SimpleConnector.ROUTER = '/aspect';
    return SimpleConnector;
}(types_1.Connector));
exports.SimpleConnector = SimpleConnector;
