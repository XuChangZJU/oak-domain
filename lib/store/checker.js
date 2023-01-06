"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var filter_1 = require("../store/filter");
var Exception_1 = require("../types/Exception");
var actionDef_1 = require("./actionDef");
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
                    var _b, expressionEntity, expr, expressionFilter, _c, result;
                    return tslib_1.__generator(this, function (_d) {
                        switch (_d.label) {
                            case 0:
                                if (context.isRoot() && type === 'expressionRelation') {
                                    return [2 /*return*/, 0];
                                }
                                _b = expression_1(operation, context, option), expressionEntity = _b.entity, expr = _b.expr, expressionFilter = _b.filter;
                                return [4 /*yield*/, context.select(expressionEntity, {
                                        data: {
                                            $expr: expr,
                                        },
                                        filter: expressionFilter,
                                    }, Object.assign({}, option, { dontCollect: true }))];
                            case 1:
                                _c = tslib_1.__read.apply(void 0, [_d.sent(), 1]), result = _c[0];
                                if (!result) {
                                    // 条件判定为假，抛异常
                                    throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_2);
                                }
                                return [2 /*return*/, 0];
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
                var _a = expression_2(operation, context, option), expressionEntity = _a.entity, expr = _a.expr, expressionFilter = _a.filter;
                var _b = tslib_1.__read(context.select(expressionEntity, {
                    data: {
                        $expr: expr,
                    },
                    filter: expressionFilter,
                }, Object.assign({}, option, { dontCollect: true })), 1), result = _b[0];
                if (!result.$expr) {
                    // 条件判定为假，抛异常
                    throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_5);
                }
                return;
            };
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInSyncContext = translateCheckerInSyncContext;
