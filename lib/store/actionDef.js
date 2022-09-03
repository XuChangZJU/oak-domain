"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeActionDefDict = exports.checkFilterContains = exports.getFullProjection = void 0;
var tslib_1 = require("tslib");
var filter_1 = require("./filter");
var types_1 = require("../types");
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
function checkFilterContains(entity, schema, contained, context, filter) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var rowStore, filter2, result, data_1;
        var _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!filter) {
                        throw new types_1.OakRowInconsistencyException();
                    }
                    // 优先判断两个条件是否相容
                    if ((0, filter_1.contains)(entity, schema, filter, contained)) {
                        return [2 /*return*/];
                    }
                    rowStore = context.rowStore;
                    filter2 = (0, filter_1.combineFilters)([filter, {
                            $not: contained,
                        }]);
                    return [4 /*yield*/, rowStore.select(entity, {
                            data: getFullProjection(entity, schema),
                            filter: filter2,
                            indexFrom: 0,
                            count: 10,
                        }, context, {
                            dontCollect: true,
                        })];
                case 1:
                    result = (_b.sent()).result;
                    if (result.length > 0) {
                        data_1 = {};
                        result.forEach(function (ele) {
                            var _a;
                            return Object.assign(data_1, (_a = {},
                                _a[ele.id] = ele,
                                _a));
                        });
                        throw new types_1.OakRowInconsistencyException({
                            a: 's',
                            d: (_a = {},
                                _a[entity] = data_1,
                                _a)
                        });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.checkFilterContains = checkFilterContains;
function makeIntrinsicWatchers(schema) {
    var _this = this;
    var watchers = [];
    var _loop_1 = function (entity) {
        var attributes = schema[entity].attributes;
        var now = Date.now();
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
                                    $lte: now,
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
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return watchers;
}
function analyzeActionDefDict(schema, actionDefDict) {
    var _this = this;
    var checkers = [];
    var triggers = [];
    var _loop_2 = function (entity) {
        var _loop_3 = function (attr) {
            var def = actionDefDict[entity][attr];
            var _a = def, stm = _a.stm, is = _a.is;
            var _loop_4 = function (action) {
                var actionStm = stm[action];
                checkers.push({
                    action: action,
                    type: 'row',
                    entity: entity,
                    checker: function (_a, context) {
                        var operation = _a.operation;
                        return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var filter, conditionalFilter;
                            var _b, _c;
                            return tslib_1.__generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        filter = operation.filter;
                                        conditionalFilter = typeof actionStm[0] === 'string' ? (_b = {},
                                            _b[attr] = actionStm[0],
                                            _b) : (_c = {},
                                            _c[attr] = {
                                                $in: actionStm[0],
                                            },
                                            _c);
                                        return [4 /*yield*/, checkFilterContains(entity, schema, conditionalFilter, context, filter)];
                                    case 1:
                                        _d.sent();
                                        return [2 /*return*/, 0];
                                }
                            });
                        });
                    }
                });
                triggers.push({
                    name: "set next state of ".concat(attr, " for ").concat(entity, " on action ").concat(action),
                    action: action,
                    entity: entity,
                    when: 'before',
                    fn: function (_a) {
                        var operation = _a.operation;
                        return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var _b, data;
                            var _c;
                            return tslib_1.__generator(this, function (_d) {
                                _b = operation.data, data = _b === void 0 ? {} : _b;
                                Object.assign(operation, {
                                    data: Object.assign(data, (_c = {},
                                        _c[attr] = stm[action][1],
                                        _c)),
                                });
                                return [2 /*return*/, 1];
                            });
                        });
                    }
                });
            };
            for (var action in stm) {
                _loop_4(action);
            }
            if (is) {
                triggers.push({
                    name: "set initial state of ".concat(attr, " for ").concat(entity, " on create"),
                    action: 'create',
                    entity: entity,
                    when: 'before',
                    fn: function (_a) {
                        var operation = _a.operation;
                        return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var data;
                            var _b;
                            return tslib_1.__generator(this, function (_c) {
                                data = operation.data;
                                if (data instanceof Array) {
                                    data.forEach(function (ele) {
                                        var _a;
                                        if (!ele[attr]) {
                                            Object.assign(ele, (_a = {},
                                                _a[attr] = is,
                                                _a));
                                        }
                                    });
                                    return [2 /*return*/, data.length];
                                }
                                else {
                                    if (!data[attr]) {
                                        Object.assign(data, (_b = {},
                                            _b[attr] = is,
                                            _b));
                                    }
                                    return [2 /*return*/, 1];
                                }
                                return [2 /*return*/];
                            });
                        });
                    }
                });
            }
        };
        for (var attr in actionDefDict[entity]) {
            _loop_3(attr);
        }
    };
    for (var entity in actionDefDict) {
        _loop_2(entity);
    }
    return {
        triggers: triggers,
        checkers: checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}
exports.analyzeActionDefDict = analyzeActionDefDict;
