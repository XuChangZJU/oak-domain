"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeActionDefDict = exports.checkFilterContains = exports.getFullProjection = void 0;
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
    return __awaiter(this, void 0, void 0, function () {
        var rowStore, filter2, result, data_1;
        var _a;
        return __generator(this, function (_b) {
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
                        }, context)];
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
                filter: function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
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
                        return __awaiter(_this, void 0, void 0, function () {
                            var filter, conditionalFilter;
                            var _b, _c;
                            return __generator(this, function (_d) {
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
                        return __awaiter(_this, void 0, void 0, function () {
                            var _b, data;
                            var _c;
                            return __generator(this, function (_d) {
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
                        return __awaiter(_this, void 0, void 0, function () {
                            var data;
                            var _b;
                            return __generator(this, function (_c) {
                                data = operation.data;
                                Object.assign(data, (_b = {},
                                    _b[attr] = is,
                                    _b));
                                return [2 /*return*/, 1];
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
