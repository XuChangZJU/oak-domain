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
            return (function (_a, context) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var operationFilter, filter2, entity2, selection2, rows2, data_1, rows2, data_2;
                    var _b, _c;
                    return tslib_1.__generator(this, function (_d) {
                        switch (_d.label) {
                            case 0:
                                operationFilter = operation.filter;
                                (0, assert_1.default)(operationFilter);
                                filter2 = typeof filter_2 === 'function' ? filter_2(context) : filter_2;
                                return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter)];
                            case 1:
                                if (_d.sent()) {
                                    return [2 /*return*/, 0];
                                }
                                if (!inconsistentRows_1) return [3 /*break*/, 3];
                                entity2 = inconsistentRows_1.entity, selection2 = inconsistentRows_1.selection;
                                return [4 /*yield*/, context.select(entity2, selection2(operationFilter), { dontCollect: true })];
                            case 2:
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
                            case 3: return [4 /*yield*/, context.select(entity, {
                                    data: (0, actionDef_1.getFullProjection)(entity, context.getSchema()),
                                    filter: Object.assign({}, operationFilter, {
                                        $not: filter2,
                                    })
                                }, { dontCollect: true })];
                            case 4:
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
            return (function (_a, context) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    return tslib_1.__generator(this, function (_b) {
                        if (context.isRoot()) {
                            return [2 /*return*/, 0];
                        }
                        // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                        operation.filter = (0, filter_1.combineFilters)([operation.filter, relationFilter_1(context)]);
                        return [2 /*return*/, 0];
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
            var filter_3 = checker.filter, errMsg_2 = checker.errMsg;
            return function (operation, context) {
                var operationFilter = operation.filter;
                var filter2 = typeof filter_3 === 'function' ? filter_3(context) : filter_3;
                (0, assert_1.default)(operationFilter);
                if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter)) {
                    return;
                }
                throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_2);
            };
        }
        case 'relation': {
            var filter_4 = checker.relationFilter, errMsg_3 = checker.errMsg;
            return function (operation, context) {
                if (context.isRoot()) {
                    return;
                }
                var filter2 = typeof filter_4 === 'function' ? filter_4(context) : filter_4;
                var operationFilter = operation.filter;
                (0, assert_1.default)(operationFilter);
                if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter)) {
                    return;
                }
                throw new Exception_1.OakUserUnpermittedException(errMsg_3);
            };
        }
        default: {
            (0, assert_1.default)(false);
        }
    }
}
exports.translateCheckerInSyncContext = translateCheckerInSyncContext;
