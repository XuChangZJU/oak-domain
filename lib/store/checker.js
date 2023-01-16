"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelationHierarchyCheckers = exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
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
                    var exprResult, result2, isLegal;
                    var _this = this;
                    return tslib_1.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (context.isRoot() && type === 'expressionRelation') {
                                    return [2 /*return*/, 0];
                                }
                                return [4 /*yield*/, expression_1(operation, context, option)];
                            case 1:
                                exprResult = _b.sent();
                                if (!(typeof exprResult === 'string')) return [3 /*break*/, 2];
                                throw new Exception_1.OakUserUnpermittedException(exprResult || errMsg_2);
                            case 2:
                                if (!(exprResult === undefined)) return [3 /*break*/, 3];
                                return [2 /*return*/, 0];
                            case 3: return [4 /*yield*/, Promise.all(exprResult.map(function (e1) { return Promise.all(e1.map(function (e2) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                    var expressionEntity, expr, expressionFilter, _a, result;
                                    return tslib_1.__generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                expressionEntity = e2.entity, expr = e2.expr, expressionFilter = e2.filter;
                                                return [4 /*yield*/, context.select(expressionEntity, {
                                                        data: {
                                                            $expr: expr,
                                                        },
                                                        filter: expressionFilter,
                                                    }, Object.assign({}, option, { dontCollect: true }))];
                                            case 1:
                                                _a = tslib_1.__read.apply(void 0, [_b.sent(), 1]), result = _a[0];
                                                return [2 /*return*/, result ? result.$expr : false];
                                        }
                                    });
                                }); })); }))];
                            case 4:
                                result2 = _b.sent();
                                isLegal = result2.find(function (r1) { return r1.every(function (r2) { return r2 === true; }); });
                                if (!isLegal) {
                                    // 条件判定为假，抛异常
                                    if (type === 'expression') {
                                        throw new Exception_1.OakRowInconsistencyException(undefined, errMsg_2);
                                    }
                                    else {
                                        throw new Exception_1.OakUserUnpermittedException(errMsg_2);
                                    }
                                }
                                _b.label = 5;
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
                    var result2 = exprResult.map(function (e1) { return e1.map(function (e2) {
                        var expressionEntity = e2.entity, expr = e2.expr, expressionFilter = e2.filter;
                        var _a = tslib_1.__read(context.select(expressionEntity, {
                            data: {
                                $expr: expr,
                            },
                            filter: expressionFilter,
                        }, Object.assign({}, option, { dontCollect: true })), 1), result = _a[0];
                        return result ? result.$expr : false;
                    }); });
                    // exprResult外层是or，里层是and关系
                    var isLegal = result2.find(function (r1) { return r1.every(function (r2) { return r2 === true; }); });
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
function translateSingleCascadeRelationItem(schema, lch, entity2, entityId, userId) {
    var cascadePath = lch.cascadePath, relations = lch.relations;
    var paths = cascadePath.split('.');
    var translateFilterIter = function (entity, iter) {
        var _a, _b, _c, _d, _e;
        var relation = (0, relation_1.judgeRelation)(schema, entity, paths[iter]);
        if (iter === paths.length - 1) {
            if (relation === 2) {
                return {
                    entity: paths[iter],
                    entityId: {
                        $in: {
                            entity: "user".concat((0, string_1.firstLetterUpperCase)(paths[iter])),
                            data: (_a = {},
                                _a["".concat(paths[iter], "Id")] = 1,
                                _a),
                            filter: {
                                userId: userId,
                                relation: {
                                    $in: relations,
                                },
                            },
                        },
                    }
                };
            }
            (0, assert_1.default)(typeof relation === 'string');
            return _b = {},
                _b["".concat(paths[iter], "Id")] = {
                    $in: {
                        entity: "user".concat((0, string_1.firstLetterUpperCase)(relation)),
                        data: (_c = {},
                            _c["".concat(relation, "Id")] = 1,
                            _c),
                        filter: {
                            userId: userId,
                            relation: {
                                $in: relations,
                            },
                        },
                    },
                },
                _b;
        }
        else {
            var subFilter = translateFilterIter(paths[iter], iter + 1);
            if (iter === 0) {
                return _d = {},
                    _d[paths[iter]] = subFilter,
                    _d.id = entityId,
                    _d;
            }
            return _e = {},
                _e[paths[iter]] = subFilter,
                _e;
        }
    };
    var filter = translateFilterIter(entity2, 0);
    return {
        entity: entity2,
        filter: filter,
        expr: {
            $gt: [{
                    '#attr': '$$createAt$$',
                }, 0]
        },
    };
}
function translateFromCascadeRelationHierarchy(schema, legalCascadeHierarchies, entity, entityId, userId) {
    if (legalCascadeHierarchies instanceof Array) {
        return legalCascadeHierarchies.map(function (ele) {
            if (ele instanceof Array) {
                return ele.map(function (ele2) { return translateSingleCascadeRelationItem(schema, ele2, entity, entityId, userId); });
            }
            return [translateSingleCascadeRelationItem(schema, ele, entity, entityId, userId)];
        });
    }
    else {
        return [[translateSingleCascadeRelationItem(schema, legalCascadeHierarchies, entity, entityId, userId)]];
    }
}
function makeRelationExpressionCombination(schema, entity, entityId, userId, relation, reverseHierarchy, reverseCascadeRelationHierarchy) {
    var _a;
    var userEntityName = "user".concat((0, string_1.firstLetterUpperCase)(entity));
    var entityIdAttr = "".concat(entity, "Id");
    var legalRelations = reverseHierarchy && reverseHierarchy[relation];
    var legalCascadeHierarchies = reverseCascadeRelationHierarchy && reverseCascadeRelationHierarchy[relation];
    if (!legalRelations && !legalCascadeHierarchies) {
        return undefined;
    }
    if ((legalRelations === null || legalRelations === void 0 ? void 0 : legalRelations.length) === 0) {
        throw new Error('这是不应该跑出来的情况，请杀程序员祭天');
    }
    var expressionCombination = [];
    if (legalRelations && legalRelations.length > 0) {
        expressionCombination.push([{
                entity: userEntityName,
                expr: {
                    $gt: [{
                            '#attr': '$$createAt$$',
                        }, 0]
                },
                filter: (_a = {
                        userId: userId
                    },
                    _a[entityIdAttr] = entityId,
                    _a.relation = {
                        $in: legalRelations,
                    },
                    _a)
            }]);
    }
    if (legalCascadeHierarchies) {
        expressionCombination.push.apply(expressionCombination, tslib_1.__spreadArray([], tslib_1.__read(translateFromCascadeRelationHierarchy(schema, legalCascadeHierarchies, entity, entityId, userId)), false));
    }
    return expressionCombination;
}
function createRelationHierarchyCheckers(schema) {
    var checkers = [];
    var _loop_1 = function (entity) {
        var _a = schema[entity], relationHierarchy = _a.relationHierarchy, reverseCascadeRelationHierarchy = _a.reverseCascadeRelationHierarchy;
        if (relationHierarchy || reverseCascadeRelationHierarchy) {
            var reverseHierarchy_1 = relationHierarchy && buildReverseHierarchyMap(relationHierarchy);
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
                    var schema = context.getSchema();
                    return makeRelationExpressionCombination(schema, entity, entityId, userId, relation, reverseHierarchy_1, reverseCascadeRelationHierarchy);
                },
                errMsg: '越权操作',
            });
            checkers.push({
                entity: userEntityName_1,
                action: 'remove',
                type: 'expressionRelation',
                expression: function (operation, context) {
                    var _a;
                    var userId = context.getCurrentUserId();
                    var filter = operation.filter;
                    var makeFilterFromRows = function (rows) {
                        var relations = (0, lodash_1.uniq)(rows.map(function (ele) { return ele.relation; }));
                        var entityIds = (0, lodash_1.uniq)(rows.map(function (ele) { return ele[entityIdAttr_1]; }));
                        (0, assert_1.default)(entityIds.length === 1, "\u5728\u56DE\u6536".concat(userEntityName_1, "\u4E0A\u6743\u9650\u65F6\uFF0C\u5355\u6B21\u56DE\u6536\u6D89\u53CA\u5230\u4E86\u4E0D\u540C\u7684\u5BF9\u8C61\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u88AB\u5141\u8BB8"));
                        var entityId = entityIds[0];
                        var schema = context.getSchema();
                        var exprComb = relations.map(function (relation) { return makeRelationExpressionCombination(schema, entity, entityId, userId, relation, reverseHierarchy_1, reverseCascadeRelationHierarchy); });
                        //  对每个relation求出其相应的exprComb，此操作对多行进行expr，需要对之进行类似于笛卡尔积的相乘
                        var result = exprComb.reduce(function (accu, current) {
                            var e_2, _a, e_3, _b;
                            if (!current) {
                                return accu;
                            }
                            var result2 = [];
                            try {
                                for (var current_1 = (e_2 = void 0, tslib_1.__values(current)), current_1_1 = current_1.next(); !current_1_1.done; current_1_1 = current_1.next()) {
                                    var c = current_1_1.value;
                                    try {
                                        for (var _c = (e_3 = void 0, tslib_1.__values(accu)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                            var a = _d.value;
                                            result2.push(a.concat(c));
                                        }
                                    }
                                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                    finally {
                                        try {
                                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                                        }
                                        finally { if (e_3) throw e_3.error; }
                                    }
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (current_1_1 && !current_1_1.done && (_a = current_1.return)) _a.call(current_1);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                            return result2;
                        }, [[]]);
                        return result && result.length > 0 ? result : undefined;
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
            /* // 一个人不能授权给自己，也不能删除自己的授权
            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'create' as ED[keyof ED]['Action'],
                type: 'data',
                checker: (data, context) => {
                    assert(!(data instanceof Array));
                    const { userId } = data as ED[keyof ED]['CreateSingle']['data'];
                    const userId2 = context.getCurrentUserId(true);
                    if (userId === userId2) {
                        throw new OakDataException('不允许授权给自己');
                    }
                }
            });
    
            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'remove' as ED[keyof ED]['Action'],
                type: 'row',
                filter: (operation, context) => {
                    const userId = context.getCurrentUserId(true);
                    if (userId) {
                        return {
                            userId: {
                                $ne: userId,
                            },
                        };
                    }
                    console.warn(`没有当前用户但在删除权限，请检查。对象是${entity}`);
                    return {};
                },
                errMsg: '不允许回收自己的授权',
            }); */
            // 转让权限现在用update动作，只允许update userId给其它人
            // todo 等实现的时候再写
        }
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return checkers;
}
exports.createRelationHierarchyCheckers = createRelationHierarchyCheckers;
