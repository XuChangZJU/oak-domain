"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeActionDefDict = exports.getFullProjection = void 0;
var tslib_1 = require("tslib");
function getFullProjection(entity, schema) {
    var attributes = schema[entity].attributes;
    var projection = {
        id: 1,
        $$createAt$$: 1,
        $$updateAt$$: 1,
        $$deleteAt$$: 1,
    };
    Object.keys(attributes).forEach(function (k) {
        var _a;
        return Object.assign(projection, (_a = {},
            _a[k] = 1,
            _a));
    });
    return projection;
}
exports.getFullProjection = getFullProjection;
function makeIntrinsicWatchers(schema) {
    var _this = this;
    var watchers = [];
    for (var entity in schema) {
        var attributes = schema[entity].attributes;
        var expiresAt = attributes.expiresAt, expired = attributes.expired;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity: entity,
                name: "\u5BF9\u8C61".concat(entity, "\u4E0A\u7684\u8FC7\u671F\u81EA\u52A8watcher"),
                filter: function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    return tslib_1.__generator(this, function (_a) {
                        return [2 /*return*/, {
                                expired: false,
                                expiresAt: {
                                    $lte: Date.now(),
                                },
                            }];
                    });
                }); },
                action: 'update',
                actionData: {
                    expired: true,
                },
            });
        }
    }
    return watchers;
}
function analyzeActionDefDict(schema, actionDefDict) {
    var checkers = [];
    var triggers = [];
    for (var entity in actionDefDict) {
        var _loop_1 = function (attr) {
            var def = actionDefDict[entity][attr];
            var _a = def, stm = _a.stm, is = _a.is;
            var _loop_2 = function (action) {
                var _b, _c;
                var actionStm = stm[action];
                var conditionalFilter = typeof actionStm[0] === 'string' ? (_b = {},
                    _b[attr] = actionStm[0],
                    _b) : (_c = {},
                    _c[attr] = {
                        $in: actionStm[0],
                    },
                    _c);
                checkers.push({
                    action: action,
                    type: 'row',
                    entity: entity,
                    filter: conditionalFilter,
                    errMsg: '',
                });
                checkers.push({
                    action: action,
                    type: 'data',
                    entity: entity,
                    priority: 10,
                    checker: function (data) {
                        var _a;
                        Object.assign(data, (_a = {},
                            _a[attr] = stm[action][1],
                            _a));
                    }
                });
            };
            for (var action in stm) {
                _loop_2(action);
            }
            if (is) {
                checkers.push({
                    action: 'create',
                    type: 'data',
                    entity: entity,
                    priority: 10,
                    checker: function (data) {
                        var _a;
                        if (data instanceof Array) {
                            data.forEach(function (ele) {
                                var _a;
                                if (!ele[attr]) {
                                    Object.assign(ele, (_a = {},
                                        _a[attr] = is,
                                        _a));
                                }
                            });
                        }
                        else {
                            if (!data[attr]) {
                                Object.assign(data, (_a = {},
                                    _a[attr] = is,
                                    _a));
                            }
                        }
                    }
                });
            }
        };
        for (var attr in actionDefDict[entity]) {
            _loop_1(attr);
        }
    }
    return {
        triggers: triggers,
        checkers: checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}
exports.analyzeActionDefDict = analyzeActionDefDict;
