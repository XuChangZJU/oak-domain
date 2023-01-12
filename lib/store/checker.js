"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelationHierarchyCheckers = exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var filter_1 = require("../store/filter");
var Exception_1 = require("../types/Exception");
var actionDef_1 = require("./actionDef");
var string_1 = require("../utils/string");
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
                        data = operation.data;
                        checkerFn_1(data, context);
                        return [2 /*return*/, 0];
                    });
                });
            });
        }
        case 'row': {
            var filter_2 = checker.filter, errMsg_1 = checker.errMsg, inconsistentRows_1 = checker.inconsistentRows;
            return (function (_a, context, option) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var operationFilter, action, filter2, entity2, selection2, rows2, data_1, rows2, data_2;
                    var _b, _c;
                    return tslib_1.__generator(this, function (_d) {
                        switch (_d.label) {
                            case 0:
                                operationFilter = operation.filter, action = operation.action;
                                filter2 = typeof filter_2 === 'function' ? filter_2(operation, context, option) : filter_2;
                                if (!['select', 'count', 'stat'].includes(action)) return [3 /*break*/, 1];
                                operation.filter = (0, filter_1.addFilterSegment)(operationFilter || {}, filter2);
                                return [2 /*return*/, 0];
                            case 1: return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter || {})];
                            case 2:
                                if (_d.sent()) {
                                    return [2 /*return*/, 0];
                                }
                                if (!inconsistentRows_1) return [3 /*break*/, 4];
                                entity2 = inconsistentRows_1.entity, selection2 = inconsistentRows_1.selection;
                                return [4 /*yield*/, context.select(entity2, selection2(operationFilter), {
                                        dontCollect: true,
                                        blockTrigger: true,
                                    })];
                            case 3:
                                rows2 = _d.sent();
                                data_1 = {};
                                rows2.forEach(function (ele) {
                                    var _a;
                                    return Object.assign(data_1, (_a = {},
                                        _a[ele.id] = ele,
                                        _a));
                                });
                                throw new Exception_1.OakRowInconsistencyException({
                                    a: 's',
                                    d: (_b = {},
                                        _b[entity2] = data_1,
                                        _b)
                                }, errMsg_1);
                            case 4: return [4 /*yield*/, context.select(entity, {
                                    data: (0, actionDef_1.getFullProjection)(entity, context.getSchema()),
                                    filter: Object.assign({}, operationFilter, {
                                        $not: filter2,
                                    })
                                }, {
                                    dontCollect: true,
                                    blockTrigger: true,
                                })];
                            case 5:
                                rows2 = _d.sent();
                                data_2 = {};
                                rows2.forEach(function (ele) {
                                    var _a;
                                    return Object.assign(data_2, (_a = {},
                                        _a[ele.id] = ele,
                                        _a));
                                });
                                throw new Exception_1.OakRowInconsistencyException({
                                    a: 's',
                                    d: (_c = {},
                                        _c[entity] = data_2,
                                        _c)
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
                    return tslib_1.__generator(this, function (_b) {
                        if (context.isRoot()) {
                            return [2 /*return*/, 0];
                        }
                        // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                        operation.filter = (0, filter_1.combineFilters)([operation.filter, relationFilter_1(operation, context, option)]);
                        return [2 /*return*/, 0];
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
                    var exprResult, expressionEntity, expr, expressionFilter, _b, result;
                    return tslib_1.__generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (context.isRoot() && type === 'expressionRelation') {
                                    return [2 /*return*/, 0];
                                }
                                exprResult = expression_1(operation, context, option);
                                if (!(typeof exprResult === 'string')) return [3 /*break*/, 1];
                                throw new Exception_1.OakUserUnpermittedException(exprResult || errMsg_2);
                            case 1:
                                if (!(exprResult === undefined)) return [3 /*break*/, 2];
                                return [2 /*return*/, 0];
                            case 2:
                                expressionEntity = exprResult.entity, expr = exprResult.expr, expressionFilter = exprResult.filter;
                                return [4 /*yield*/, context.select(expressionEntity, {
                                        data: {
                                            $expr: expr,
                                        },
                                        filter: expressionFilter,
                                    }, Object.assign({}, option, { dontCollect: true }))];
                            case 3:
                                _b = tslib_1.__read.apply(void 0, [_c.sent(), 1]), result = _b[0];
                                if (!result) {
                                    // 条件判定为假，抛异常
                                    throw new Exception_1.OakUserUnpermittedException(errMsg_2);
                                }
                                _c.label = 4;
                            case 4: return [2 /*return*/, 0];
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
                    if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter)) {
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
                if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter)) {
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
                    var expressionEntity = exprResult.entity, expr = exprResult.expr, expressionFilter = exprResult.filter;
                    var _a = tslib_1.__read(context.select(expressionEntity, {
                        data: {
                            $expr: expr,
                        },
                        filter: expressionFilter,
                    }, Object.assign({}, option, { dontCollect: true })), 1), result = _a[0];
                    if (!result.$expr) {
                        // 条件判定为假，抛异常
                        throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_5);
                    }
                    return;
                }
            };
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInSyncContext = translateCheckerInSyncContext;
function createRelationHierarchyCheckers(schema) {
    var checkers = [];
    var _loop_1 = function (entity) {
        var e_1, _a;
        var relationHierarchy = schema[entity].relationHierarchy;
        if (relationHierarchy) {
            // 先build反向hierarchy的map
            var reverseHierarchy_1 = {};
            for (var r in relationHierarchy) {
                try {
                    for (var _b = (e_1 = void 0, tslib_1.__values(relationHierarchy[r])), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var r2 = _c.value;
                        if (!reverseHierarchy_1[r2]) {
                            reverseHierarchy_1[r2] = [r];
                        }
                        else {
                            reverseHierarchy_1[r2].push(r);
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
            // 对userEntity对象的授权和回收建立checker
            var userEntityName_1 = "user".concat((0, string_1.firstLetterUpperCase)(entity));
            var entityIdAttr_1 = "".concat(entity, "Id");
            checkers.push({
                entity: userEntityName_1,
                action: 'create',
                type: 'expressionRelation',
                expression: function (operation, context) {
                    var _a;
                    var data = operation.data;
                    var _b = data, relation = _b.relation, _c = entityIdAttr_1, entityId = _b[_c];
                    var legalRelations = reverseHierarchy_1[relation];
                    if (!legalRelations) {
                        return undefined;
                    }
                    if (legalRelations.length === 0) {
                        return '这是不应该跑出来的情况，请杀程序员祭天';
                    }
                    var userId = context.getCurrentUserId();
                    return {
                        entity: userEntityName_1,
                        expr: {
                            $gt: [{
                                    '#attr': '$$createAt$$',
                                }, 0]
                        },
                        filter: (_a = {
                                userId: userId
                            },
                            _a[entityIdAttr_1] = entityId,
                            _a.relation = {
                                $in: legalRelations,
                            },
                            _a)
                    };
                },
                errMsg: '越权操作',
            });
            var _loop_2 = function (r) {
                checkers.push({
                    entity: userEntityName_1,
                    action: 'remove',
                    type: 'expressionRelation',
                    expression: function (operation, context) {
                        var _a, _b;
                        var userId = context.getCurrentUserId();
                        var filter = operation.filter;
                        var legalRelations = reverseHierarchy_1[r];
                        if (legalRelations.length === 0) {
                            return '这是不应该跑出来的情况，请杀程序员祭天';
                        }
                        return {
                            entity: userEntityName_1,
                            expr: {
                                $gt: [{
                                        '#attr': '$$createAt$$',
                                    }, 0]
                            },
                            filter: (_a = {
                                    userId: userId
                                },
                                _a[entityIdAttr_1] = {
                                    $in: {
                                        entity: userEntityName_1,
                                        data: (_b = {},
                                            _b[entityIdAttr_1] = 1,
                                            _b),
                                        filter: filter,
                                    }
                                },
                                _a.relation = {
                                    $in: legalRelations,
                                },
                                _a),
                        };
                    },
                    errMsg: '越权操作',
                });
            };
            for (var r in reverseHierarchy_1) {
                _loop_2(r);
            }
            // 一个人不能授权给自己，也不能删除自己的授权
            checkers.push({
                entity: userEntityName_1,
                action: 'create',
                type: 'data',
                checker: function (data, context) {
                    (0, assert_1.default)(!(data instanceof Array));
                    var userId = data.userId;
                    var userId2 = context.getCurrentUserId();
                    if (userId === userId2) {
                        throw new Exception_1.OakDataException('不允许授权给自己');
                    }
                }
            });
            checkers.push({
                entity: userEntityName_1,
                action: 'remove',
                type: 'row',
                filter: function (operation, context) {
                    var userId = context.getCurrentUserId();
                    return {
                        userId: {
                            $ne: userId,
                        },
                    };
                },
                errMsg: '不允许回收自己的授权',
            });
            // 转让现在用update动作，只允许update userId给其它人
            // todo 等实现的时候再写
        }
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return checkers;
}
exports.createRelationHierarchyCheckers = createRelationHierarchyCheckers;
