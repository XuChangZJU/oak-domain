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
    var entity = checker.entity, type = checker.type;
    switch (type) {
        case 'data': {
            var checkerFn_1 = checker.checker;
            return (function (_a, context) {
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
        }
        case 'row': {
            var filter_2 = checker.filter, errMsg_1 = checker.errMsg, inconsistentRows_1 = checker.inconsistentRows;
            return (function (_a, context, option) {
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
        }
        case 'relation': {
            var relationFilter_1 = checker.relationFilter;
            return (function (_a, context, option) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var _b, _c, _d;
                    return tslib_1.__generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                if (context.isRoot()) {
                                    return [2 /*return*/, 0];
                                }
                                (0, assert_1.default)(operation.action !== 'create', "".concat(entity, "\u4E0A\u7684create\u52A8\u4F5C\u5B9A\u4E49\u4E86relation\u7C7B\u578B\u7684checker,\u8BF7\u4F7F\u7528expressionRelation\u66FF\u4EE3"));
                                // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                                _b = operation;
                                _c = filter_1.combineFilters;
                                _d = [operation.filter];
                                return [4 /*yield*/, relationFilter_1(operation, context, option)];
                            case 1:
                                // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                                _b.filter = _c.apply(void 0, [_d.concat([_e.sent()])]);
                                return [2 /*return*/, 0];
                        }
                    });
                });
            });
        }
        case 'expression':
        case 'expressionRelation': {
            var expression_1 = checker.expression, errMsg_2 = checker.errMsg;
            return (function (_a, context, option) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var exprResult, expressionEntity, expr, expressionFilter, _b, result, isLegal;
                    return tslib_1.__generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (context.isRoot() && type === 'expressionRelation') {
                                    return [2 /*return*/, 0];
                                }
                                return [4 /*yield*/, expression_1(operation, context, option)];
                            case 1:
                                exprResult = _c.sent();
                                if (!(typeof exprResult === 'string')) return [3 /*break*/, 2];
                                throw new Exception_1.OakUserUnpermittedException(exprResult || errMsg_2);
                            case 2:
                                if (!(exprResult === undefined)) return [3 /*break*/, 3];
                                return [2 /*return*/, 0];
                            case 3:
                                expressionEntity = exprResult.entity, expr = exprResult.expr, expressionFilter = exprResult.filter;
                                return [4 /*yield*/, context.select(expressionEntity, {
                                        data: {
                                            $expr: expr,
                                        },
                                        filter: expressionFilter,
                                    }, Object.assign({}, option, { dontCollect: true }))];
                            case 4:
                                _b = tslib_1.__read.apply(void 0, [_c.sent(), 1]), result = _b[0];
                                isLegal = result ? result.$expr : false;
                                if (!isLegal) {
                                    // 条件判定为假，抛异常
                                    if (type === 'expression') {
                                        throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_2);
                                    }
                                    else {
                                        throw new Exception_1.OakUserUnpermittedException(errMsg_2);
                                    }
                                }
                                _c.label = 5;
                            case 5: return [2 /*return*/, 0];
                        }
                    });
                });
            });
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInAsyncContext = translateCheckerInAsyncContext;
function translateCheckerInSyncContext(checker) {
    var entity = checker.entity, type = checker.type;
    switch (type) {
        case 'data': {
            var checkerFn_2 = checker.checker;
            return function (operation, context) { return checkerFn_2(operation.data, context); };
        }
        case 'row': {
            var filter_3 = checker.filter, errMsg_3 = checker.errMsg;
            return function (operation, context, option) {
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
        }
        case 'relation': {
            var filter_4 = checker.relationFilter, errMsg_4 = checker.errMsg;
            return function (operation, context, option) {
                if (context.isRoot()) {
                    return;
                }
                var filter2 = typeof filter_4 === 'function' ? filter_4(operation, context, option) : filter_4;
                var operationFilter = operation.filter;
                (0, assert_1.default)(operationFilter);
                (0, assert_1.default)(!(filter2 instanceof Promise));
                if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter, true)) {
                    return;
                }
                throw new Exception_1.OakUserUnpermittedException(errMsg_4);
            };
        }
        case 'expression':
        case 'expressionRelation': {
            var expression_2 = checker.expression, errMsg_5 = checker.errMsg;
            return function (operation, context, option) {
                if (context.isRoot() && type === 'expressionRelation') {
                    return;
                }
                var exprResult = expression_2(operation, context, option);
                if (typeof exprResult === 'string') {
                    throw new Exception_1.OakUserUnpermittedException(exprResult || errMsg_5);
                }
                else if (exprResult === undefined) {
                    return 0;
                }
                else {
                    (0, assert_1.default)(!(exprResult instanceof Promise));
                    var expressionEntity = exprResult.entity, expr = exprResult.expr, expressionFilter = exprResult.filter;
                    var _a = tslib_1.__read(context.select(expressionEntity, {
                        data: {
                            $expr: expr,
                        },
                        filter: expressionFilter,
                    }, Object.assign({}, option, { dontCollect: true })), 1), result = _a[0];
                    var isLegal = result ? result.$expr : false;
                    if (!isLegal) {
                        // 条件判定为假，抛异常
                        if (type === 'expression') {
                            throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_5);
                        }
                        else {
                            throw new Exception_1.OakUserUnpermittedException(errMsg_5);
                        }
                    }
                }
            };
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInSyncContext = translateCheckerInSyncContext;
function buildReverseHierarchyMap(relationHierarchy) {
    var e_1, _a;
    var reverseHierarchy = {};
    for (var r in relationHierarchy) {
        try {
            for (var _b = (e_1 = void 0, tslib_1.__values(relationHierarchy[r])), _c = _b.next(); !_c.done; _c = _b.next()) {
                var r2 = _c.value;
                if (!reverseHierarchy[r2]) {
                    reverseHierarchy[r2] = [r];
                }
                else {
                    reverseHierarchy[r2].push(r);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return reverseHierarchy;
}
function translateCascadeRelationFilterMaker(schema, lch, entity2) {
    var cascadePath = lch.cascadePath, relations = lch.relations;
    var paths = cascadePath.split('.');
    var translateRelationFilter = function (entity) {
        // 有两种情况，此entity和user有Relation定义，或是此entity上有userId
        if (schema[entity].relation) {
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
        var attributes = schema[entity].attributes;
        (0, assert_1.default)(attributes.hasOwnProperty('userId') && attributes.userId.type === 'ref' && attributes.userId.ref === 'user', "\u5728".concat(entity, "\u4E0A\u65E2\u627E\u4E0D\u5230userId\uFF0C\u4E5F\u6CA1\u6709relation\u5B9A\u4E49"));
        return function (userId) { return ({
            userId: userId,
        }); };
    };
    var translateFilterMakerIter = function (entity, iter) {
        var relation = (0, relation_1.judgeRelation)(schema, entity, paths[iter]);
        if (iter === paths.length - 1) {
            if (relation === 2) {
                var filterMaker_1 = translateRelationFilter(paths[iter]);
                return function (userId) {
                    var _a;
                    var filter = filterMaker_1(userId);
                    if (filter.$in) {
                        return {
                            entity: paths[iter],
                            entityId: filter
                        };
                    }
                    return _a = {},
                        _a[paths[iter]] = filter,
                        _a;
                };
            }
            (0, assert_1.default)(typeof relation === 'string');
            var filterMaker_2 = translateRelationFilter(relation);
            return function (userId) {
                var _a, _b;
                var filter = filterMaker_2(userId);
                if (filter.$in) {
                    return _a = {},
                        _a["".concat(paths[iter], "Id")] = filter,
                        _a;
                }
                return _b = {},
                    _b[paths[iter]] = filter,
                    _b;
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
    var filter = paths.length > 0 ? translateFilterMakerIter(entity2, 0) : translateRelationFilter(entity2);
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
                    type: 'expressionRelation',
                    expression: function (operation, context) {
                        var data = operation.data;
                        (0, assert_1.default)(!(data instanceof Array));
                        var _a = data, relation = _a.relation, _b = entityIdAttr_1, entityId = _a[_b];
                        var userId = context.getCurrentUserId();
                        if (!raFilterMakerDict_1[relation]) {
                            return;
                        }
                        var filter = raFilterMakerDict_1[relation](userId);
                        return {
                            entity: entity,
                            filter: (0, filter_1.combineFilters)([filter, { id: entityId }]),
                            expr: {
                                $gt: [{
                                        '#attr': '$$createAt$$',
                                    }, 0]
                            },
                        };
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
                            var entityId = entityIds[0];
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
                    if (a === 'create') {
                        /**
                         * create动作所增加的auth约束只可能在外键的对象上，但因为还有级联和触发器，不太容易在创建前检查，先放在创建后
                         */
                        var _c = actionAuth[a];
                        checkers.push({
                            entity: entity,
                            action: a,
                            type: 'expressionRelation',
                            when: 'after',
                            expression: function (operation, context) {
                                // 在插入后检查
                                var makeExprInner = function (data) {
                                    var id = data.id;
                                    return {
                                        entity: entity,
                                        filter: (0, filter_1.combineFilters)([filter, { id: id }]),
                                        expr: {
                                            $gt: [{
                                                    '#attr': '$$createAt$$',
                                                }, 0]
                                        },
                                    };
                                };
                                var filter = filterMaker(context.getCurrentUserId());
                                var data = operation.data;
                                if (data instanceof Array) {
                                    throw new Error('需要expr支持count');
                                }
                                return makeExprInner(data);
                            },
                            errMsg: '定义的actionAuth中检查出来越权操作',
                        });
                    }
                    else {
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
                    }
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
