"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthCheckers = exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var filter_1 = require("../store/filter");
var Exception_1 = require("../types/Exception");
var actionDef_1 = require("./actionDef");
var string_1 = require("../utils/string");
var lodash_1 = require("../utils/lodash");
var relation_1 = require("./relation");
function translateCheckerInAsyncContext(checker) {
    var _this = this;
    var entity = checker.entity, type = checker.type, action = checker.action;
    var when = ((action === 'create' || action instanceof Array && action.includes('create')) && ['relation'].includes(type)) ? 'after' : 'before';
    switch (type) {
        case 'data': {
            var checkerFn_1 = checker.checker;
            var fn = (function (_a, context) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var data;
                    return tslib_1.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                data = operation.data;
                                return [4 /*yield*/, checkerFn_1(data, context)];
                            case 1:
                                _b.sent();
                                return [2 /*return*/, 0];
                        }
                    });
                });
            });
            return {
                fn: fn,
                when: when,
            };
        }
        case 'row': {
            var filter_2 = checker.filter, errMsg_1 = checker.errMsg, inconsistentRows_1 = checker.inconsistentRows;
            var fn = (function (_a, context, option) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var operationFilter, action, filter2, _b, entity2, selection2, rows2, data_1, rows2, data_2;
                    var _c, _d;
                    return tslib_1.__generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                operationFilter = operation.filter, action = operation.action;
                                if (!(typeof filter_2 === 'function')) return [3 /*break*/, 2];
                                return [4 /*yield*/, filter_2(operation, context, option)];
                            case 1:
                                _b = _e.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                _b = filter_2;
                                _e.label = 3;
                            case 3:
                                filter2 = _b;
                                if (!['select', 'count', 'stat'].includes(action)) return [3 /*break*/, 4];
                                operation.filter = (0, filter_1.addFilterSegment)(operationFilter || {}, filter2);
                                return [2 /*return*/, 0];
                            case 4: return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter || {}, true)];
                            case 5:
                                if (_e.sent()) {
                                    return [2 /*return*/, 0];
                                }
                                if (!inconsistentRows_1) return [3 /*break*/, 7];
                                entity2 = inconsistentRows_1.entity, selection2 = inconsistentRows_1.selection;
                                return [4 /*yield*/, context.select(entity2, selection2(operationFilter), {
                                        dontCollect: true,
                                        blockTrigger: true,
                                    })];
                            case 6:
                                rows2 = _e.sent();
                                data_1 = {};
                                rows2.forEach(function (ele) {
                                    var _a;
                                    return Object.assign(data_1, (_a = {},
                                        _a[ele.id] = ele,
                                        _a));
                                });
                                throw new Exception_1.OakRowInconsistencyException({
                                    a: 's',
                                    d: (_c = {},
                                        _c[entity2] = data_1,
                                        _c)
                                }, errMsg_1);
                            case 7: return [4 /*yield*/, context.select(entity, {
                                    data: (0, actionDef_1.getFullProjection)(entity, context.getSchema()),
                                    filter: Object.assign({}, operationFilter, {
                                        $not: filter2,
                                    })
                                }, {
                                    dontCollect: true,
                                    blockTrigger: true,
                                })];
                            case 8:
                                rows2 = _e.sent();
                                data_2 = {};
                                rows2.forEach(function (ele) {
                                    var _a;
                                    return Object.assign(data_2, (_a = {},
                                        _a[ele.id] = ele,
                                        _a));
                                });
                                throw new Exception_1.OakRowInconsistencyException({
                                    a: 's',
                                    d: (_d = {},
                                        _d[entity] = data_2,
                                        _d)
                                }, errMsg_1);
                        }
                    });
                });
            });
            return {
                fn: fn,
                when: when,
            };
        }
        case 'relation': {
            var relationFilter_1 = checker.relationFilter, errMsg_2 = checker.errMsg;
            var fn = (function (_a, context, option) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var filter2, data, filter, _b, _c, _d;
                    return tslib_1.__generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                if (context.isRoot()) {
                                    return [2 /*return*/, 0];
                                }
                                if (!(operation.action === 'create')) return [3 /*break*/, 3];
                                return [4 /*yield*/, relationFilter_1(operation, context, option)];
                            case 1:
                                filter2 = _e.sent();
                                data = operation.data;
                                filter = data instanceof Array ? {
                                    id: {
                                        $in: data.map(function (ele) { return ele.id; }),
                                    },
                                } : {
                                    id: data.id,
                                };
                                return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, filter2, filter, true)];
                            case 2:
                                if (_e.sent()) {
                                    return [2 /*return*/, 0];
                                }
                                throw new Exception_1.OakUserUnpermittedException(errMsg_2);
                            case 3:
                                _b = operation;
                                _c = filter_1.combineFilters;
                                _d = [operation.filter];
                                return [4 /*yield*/, relationFilter_1(operation, context, option)];
                            case 4:
                                _b.filter = _c.apply(void 0, [_d.concat([_e.sent()])]);
                                _e.label = 5;
                            case 5: return [2 /*return*/, 0];
                        }
                    });
                });
            });
            return {
                fn: fn,
                when: when,
            };
        }
        case 'logical':
        case 'logicalRelation': {
            var checkerFn_2 = checker.checker;
            var fn = (function (_a, context, option) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    return tslib_1.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (context.isRoot() && type === 'logicalRelation') {
                                    return [2 /*return*/, 0];
                                }
                                return [4 /*yield*/, checkerFn_2(operation, context, option)];
                            case 1:
                                _b.sent();
                                return [2 /*return*/, 0];
                        }
                    });
                });
            });
            return {
                fn: fn,
                when: when,
            };
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInAsyncContext = translateCheckerInAsyncContext;
function translateCheckerInSyncContext(checker) {
    var entity = checker.entity, type = checker.type, action = checker.action;
    var when = ((action === 'create' || action instanceof Array && action.includes('create')) && ['relation'].includes(type)) ? 'after' : 'before';
    switch (type) {
        case 'data': {
            var checkerFn_3 = checker.checker;
            var fn = function (operation, context) { return checkerFn_3(operation.data, context); };
            return {
                fn: fn,
                when: when,
            };
        }
        case 'row': {
            var filter_3 = checker.filter, errMsg_3 = checker.errMsg;
            var fn = function (operation, context, option) {
                var operationFilter = operation.filter, action = operation.action;
                var filter2 = typeof filter_3 === 'function' ? filter_3(operation, context, option) : filter_3;
                (0, assert_1.default)(operationFilter);
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = (0, filter_1.addFilterSegment)(operationFilter, filter2);
                    return 0;
                }
                else {
                    (0, assert_1.default)(!(filter2 instanceof Promise));
                    if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter, true)) {
                        return;
                    }
                    throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_3);
                }
            };
            return {
                fn: fn,
                when: when,
            };
        }
        case 'relation': {
            var relationFilter_2 = checker.relationFilter, errMsg_4 = checker.errMsg;
            var fn = function (operation, context, option) {
                if (context.isRoot()) {
                    return;
                }
                var filter2 = typeof relationFilter_2 === 'function' ? relationFilter_2(operation, context, option) : relationFilter_2;
                var filter = operation.filter, action = operation.action;
                var filter3 = filter;
                if (action === 'create') {
                    var data = operation.data;
                    filter3 = data instanceof Array ? {
                        id: {
                            $in: data.map(function (ele) { return ele.id; }),
                        },
                    } : { id: data.id };
                }
                (0, assert_1.default)(filter3);
                (0, assert_1.default)(!(filter2 instanceof Promise));
                if ((0, filter_1.checkFilterContains)(entity, context, filter2, filter3, true)) {
                    return;
                }
                throw new Exception_1.OakUserUnpermittedException(errMsg_4);
            };
            return {
                fn: fn,
                when: when,
            };
        }
        case 'logical':
        case 'logicalRelation': {
            var checkerFn_4 = checker.checker;
            var fn = function (operation, context, option) {
                if (context.isRoot() && type === 'logicalRelation') {
                    return;
                }
                checkerFn_4(operation, context, option);
            };
            return {
                fn: fn,
                when: when,
            };
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInSyncContext = translateCheckerInSyncContext;
function translateCascadeRelationFilterMaker(schema, lch, entity2) {
    var cascadePath = lch.cascadePath, relations = lch.relations;
    var paths = cascadePath.split('.');
    var translateRelationFilter = function (entity) {
        // 有两种情况，此entity和user有Relation定义，或是此entity已经指向user
        if (entity === 'user') {
            return function (userId) { return ({
                id: userId,
            }); };
        }
        else if (schema[entity].relation) {
            if (relations) {
                var diff = (0, lodash_1.difference)(relations, schema[entity].relation);
                if (diff.length > 0) {
                    throw new Error("".concat(entity2, "\u4E0A\u67D0auth\u5B9A\u4E49\u7684relations\u4E2D\u542B\u6709\u4E0D\u53EF\u8BC6\u522B\u7684\u5173\u7CFB\u5B9A\u4E49").concat(diff.join(','), "\uFF0C \u8BF7\u4ED4\u7EC6\u68C0\u67E5"));
                }
            }
            var relationEntityName_1 = "user".concat((0, string_1.firstLetterUpperCase)(entity));
            return function (userId) {
                var _a;
                var filter = relations ? {
                    userId: userId,
                    relation: {
                        $in: relations,
                    },
                } : {
                    userId: userId,
                };
                return {
                    id: {
                        $in: {
                            entity: relationEntityName_1,
                            data: (_a = {},
                                _a["".concat(entity, "Id")] = 1,
                                _a),
                            filter: filter,
                        },
                    },
                };
            };
        }
        else {
            (0, assert_1.default)(false, "".concat(entity2, "\u4E0A\u67D0auth\u5B9A\u4E49\u7684cascadePath").concat(cascadePath, "\u4E0D\u80FD\u5B9A\u4F4D\u5230User\u5BF9\u8C61\u6216\u8005\u548CUser\u5173\u8054\u7684\u5173\u7CFB\u5BF9\u8C61\uFF0C \u8BF7\u4ED4\u7EC6\u68C0\u67E5"));
        }
    };
    var translateFilterMakerIter = function (entity, iter) {
        var relation = (0, relation_1.judgeRelation)(schema, entity, paths[iter]);
        if (iter === paths.length - 1) {
            if (relation === 2) {
                var filterMaker_1 = translateRelationFilter(paths[iter]);
                return function (userId) {
                    var filter = filterMaker_1(userId);
                    (0, assert_1.default)(filter.id);
                    return {
                        entity: paths[iter],
                        entityId: filter.id,
                    };
                };
            }
            (0, assert_1.default)(typeof relation === 'string');
            var filterMaker_2 = translateRelationFilter(relation);
            return function (userId) {
                var _a;
                var filter = filterMaker_2(userId);
                (0, assert_1.default)(filter.id);
                return _a = {},
                    _a["".concat(paths[iter], "Id")] = filter.id,
                    _a;
            };
        }
        else {
            var subFilterMaker_1 = translateFilterMakerIter(paths[iter], iter + 1);
            if (iter === 0) {
                return function (userId) {
                    var _a;
                    var subFilter = subFilterMaker_1(userId);
                    return _a = {},
                        _a[paths[iter]] = subFilter,
                        _a;
                };
            }
            return function (userId) {
                var _a;
                return (_a = {},
                    _a[paths[iter]] = subFilterMaker_1(userId),
                    _a);
            };
        }
    };
    var filter = cascadePath ? translateFilterMakerIter(entity2, 0) : translateRelationFilter(entity2);
    return filter;
}
function translateActionAuthFilterMaker(schema, relationItem, entity) {
    if (relationItem instanceof Array) {
        var maker_1 = relationItem.map(function (ele) {
            if (ele instanceof Array) {
                return ele.map(function (ele2) { return translateCascadeRelationFilterMaker(schema, ele2, entity); });
            }
            return [translateCascadeRelationFilterMaker(schema, ele, entity)];
        });
        return function (userId) { return ({
            $or: maker_1.map(function (ele) { return ({
                $and: ele.map(function (ele2) { return ele2(userId); })
            }); })
        }); };
    }
    var filterMaker = translateCascadeRelationFilterMaker(schema, relationItem, entity);
    return function (userId) { return filterMaker(userId); };
}
function createAuthCheckers(schema, authDict) {
    var checkers = [];
    var _loop_1 = function (entity) {
        var _a;
        if (authDict[entity]) {
            var _b = authDict[entity], relationAuth = _b.relationAuth, actionAuth = _b.actionAuth;
            if (relationAuth) {
                var raFilterMakerDict_1 = {};
                for (var r in relationAuth) {
                    Object.assign(raFilterMakerDict_1, (_a = {},
                        _a[r] = translateActionAuthFilterMaker(schema, relationAuth[r], entity),
                        _a));
                }
                var userEntityName_1 = "user".concat((0, string_1.firstLetterUpperCase)(entity));
                var entityIdAttr_1 = "".concat(entity, "Id");
                checkers.push({
                    entity: userEntityName_1,
                    action: 'create',
                    type: 'relation',
                    relationFilter: function (operation, context) {
                        var _a;
                        var data = operation.data;
                        (0, assert_1.default)(!(data instanceof Array));
                        var _b = data, relation = _b.relation, _c = entityIdAttr_1, entityId = _b[_c];
                        var userId = context.getCurrentUserId();
                        if (!raFilterMakerDict_1[relation]) {
                            return;
                        }
                        var filter = raFilterMakerDict_1[relation](userId);
                        return _a = {},
                            _a[entity] = filter,
                            _a;
                    },
                    errMsg: '越权操作',
                });
                checkers.push({
                    entity: userEntityName_1,
                    action: 'remove',
                    type: 'relation',
                    relationFilter: function (operation, context) {
                        var _a;
                        var userId = context.getCurrentUserId();
                        var filter = operation.filter;
                        var makeFilterFromRows = function (rows) {
                            var relations = (0, lodash_1.uniq)(rows.map(function (ele) { return ele.relation; }));
                            var entityIds = (0, lodash_1.uniq)(rows.map(function (ele) { return ele[entityIdAttr_1]; }));
                            (0, assert_1.default)(entityIds.length === 1, "\u5728\u56DE\u6536".concat(userEntityName_1, "\u4E0A\u6743\u9650\u65F6\uFF0C\u5355\u6B21\u56DE\u6536\u6D89\u53CA\u5230\u4E86\u4E0D\u540C\u7684\u5BF9\u8C61\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u88AB\u5141\u8BB8"));
                            // const entityId = entityIds[0]!;
                            // 所有的relation条件要同时满足and关系（注意这里的filter翻译出来是在entity对象上，不是在userEntity对象上）
                            return {
                                $and: relations.map(function (relation) { return raFilterMakerDict_1[relation]; }).filter(function (ele) { return !!ele; }).map(function (ele) {
                                    var _a;
                                    return (_a = {},
                                        _a[entity] = ele(userId),
                                        _a);
                                })
                            };
                        };
                        var toBeRemoved = context.select(userEntityName_1, {
                            data: (_a = {
                                    id: 1,
                                    relation: 1
                                },
                                _a[entityIdAttr_1] = 1,
                                _a),
                            filter: filter,
                        }, { dontCollect: true });
                        if (toBeRemoved instanceof Promise) {
                            return toBeRemoved.then(function (rows) { return makeFilterFromRows(rows); });
                        }
                        return makeFilterFromRows(toBeRemoved);
                    },
                    errMsg: '越权操作',
                });
                // 转让权限现在用update动作，只允许update userId给其它人
                // todo 等实现的时候再写
            }
            if (actionAuth) {
                var _loop_2 = function (a) {
                    var filterMaker = translateActionAuthFilterMaker(schema, actionAuth[a], entity);
                    checkers.push({
                        entity: entity,
                        action: a,
                        type: 'relation',
                        relationFilter: function (operation, context) {
                            // const { filter } = operation;
                            var filter = filterMaker(context.getCurrentUserId());
                            return filter;
                        },
                        errMsg: '定义的actionAuth中检查出来越权操作',
                    });
                };
                for (var a in actionAuth) {
                    _loop_2(a);
                }
            }
        }
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return checkers;
}
exports.createAuthCheckers = createAuthCheckers;
