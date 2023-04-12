"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreateCheckers = exports.createRemoveCheckers = exports.createAuthCheckers = exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var filter_1 = require("../store/filter");
var Exception_1 = require("../types/Exception");
var types_1 = require("../types");
var actionDef_1 = require("./actionDef");
var string_1 = require("../utils/string");
var lodash_1 = require("../utils/lodash");
var relation_1 = require("./relation");
var uuid_1 = require("../utils/uuid");
/**
 *
 * @param checker 要翻译的checker
 * @param silent 如果silent，则row和relation类型的checker只会把限制条件加到查询上，而不报错（除掉create动作）
 * @returns
 */
function translateCheckerInAsyncContext(checker) {
    var _this = this;
    var entity = checker.entity, type = checker.type;
    var when = 'before'; // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
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
                    var operationFilter, action, filter2, _b, entity2, selection2, rows2, e, rows2, e;
                    return tslib_1.__generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                operationFilter = operation.filter, action = operation.action;
                                if (!(typeof filter_2 === 'function')) return [3 /*break*/, 2];
                                return [4 /*yield*/, filter_2(operation, context, option)];
                            case 1:
                                _b = _c.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                _b = filter_2;
                                _c.label = 3;
                            case 3:
                                filter2 = _b;
                                if (!['select', 'count', 'stat'].includes(action)) return [3 /*break*/, 4];
                                operation.filter = (0, filter_1.addFilterSegment)(operationFilter || {}, filter2);
                                return [2 /*return*/, 0];
                            case 4: return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter || {}, true)];
                            case 5:
                                if (_c.sent()) {
                                    return [2 /*return*/, 0];
                                }
                                if (!inconsistentRows_1) return [3 /*break*/, 7];
                                entity2 = inconsistentRows_1.entity, selection2 = inconsistentRows_1.selection;
                                return [4 /*yield*/, context.select(entity2, selection2(operationFilter), {
                                        dontCollect: true,
                                        blockTrigger: true,
                                    })];
                            case 6:
                                rows2 = _c.sent();
                                e = new Exception_1.OakRowInconsistencyException(undefined, errMsg_1);
                                e.addData(entity2, rows2);
                                throw e;
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
                                rows2 = _c.sent();
                                e = new Exception_1.OakRowInconsistencyException(undefined, errMsg_1);
                                e.addData(entity, rows2);
                                throw e;
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
                    var result, _b, filter, action;
                    return tslib_1.__generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (context.isRoot()) {
                                    return [2 /*return*/, 0];
                                }
                                if (!(typeof relationFilter_1 === 'function')) return [3 /*break*/, 2];
                                return [4 /*yield*/, relationFilter_1(operation, context, option)];
                            case 1:
                                _b = _c.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                _b = relationFilter_1;
                                _c.label = 3;
                            case 3:
                                result = _b;
                                if (!result) return [3 /*break*/, 5];
                                filter = operation.filter, action = operation.action;
                                if (action === 'create') {
                                    console.warn("".concat(entity, "\u5BF9\u8C61\u7684create\u7C7B\u578B\u7684checker\u4E2D\uFF0C\u5B58\u5728\u65E0\u6CD5\u8F6C\u6362\u4E3A\u8868\u8FBE\u5F0F\u5F62\u5F0F\u7684\u60C5\u51B5\uFF0C\u8BF7\u5C3D\u91CF\u4F7F\u7528authDef\u683C\u5F0F\u5B9A\u4E49\u8FD9\u7C7Bchecker"));
                                    return [2 /*return*/, 0];
                                }
                                if (['select', 'count', 'stat'].includes(action)) {
                                    operation.filter = (0, filter_1.addFilterSegment)(filter || {}, result);
                                    return [2 /*return*/, 0];
                                }
                                (0, assert_1.default)(filter);
                                return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, result, filter, true)];
                            case 4:
                                if (_c.sent()) {
                                    return [2 /*return*/];
                                }
                                throw new Exception_1.OakUserUnpermittedException(errMsg_2);
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
    var entity = checker.entity, type = checker.type;
    var when = 'before'; // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
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
                (0, assert_1.default)(!(filter2 instanceof Promise));
                if ((0, filter_1.checkFilterContains)(entity, context, filter2, operationFilter, true)) {
                    return;
                }
                var e = new Exception_1.OakRowInconsistencyException(undefined, errMsg_3);
                throw e;
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
                var result = typeof relationFilter_2 === 'function' ? relationFilter_2(operation, context, option) : relationFilter_2;
                (0, assert_1.default)(!(result instanceof Promise));
                if (result) {
                    var filter = operation.filter, action = operation.action;
                    if (action === 'create') {
                        console.warn("".concat(entity, "\u5BF9\u8C61\u7684create\u7C7B\u578B\u7684checker\u4E2D\uFF0C\u5B58\u5728\u65E0\u6CD5\u8F6C\u6362\u4E3A\u8868\u8FBE\u5F0F\u5F62\u5F0F\u7684\u60C5\u51B5\uFF0C\u8BF7\u5C3D\u91CF\u4F7F\u7528authDef\u683C\u5F0F\u5B9A\u4E49\u8FD9\u7C7Bchecker"));
                        return;
                    }
                    (0, assert_1.default)(filter);
                    if ((0, filter_1.checkFilterContains)(entity, context, result, filter, true)) {
                        return;
                    }
                    throw new Exception_1.OakUserUnpermittedException(errMsg_4);
                }
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
function translateCascadeRelationFilterMaker(schema, lch, entity2, pathPrefix) {
    var cascadePath = lch.cascadePath, relations = lch.relations;
    var paths = cascadePath ? cascadePath.split('.') : [];
    if (pathPrefix) {
        paths.unshift(pathPrefix);
    }
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
        (0, assert_1.default)(relation === 2 || typeof relation === 'string');
        if (iter === paths.length - 1) {
            if (relation === 2) {
                var filterMaker2_1 = translateRelationFilter(paths[iter]);
                return function (userId) {
                    var filter = filterMaker2_1(userId);
                    (0, assert_1.default)(filter.id);
                    return {
                        entity: paths[iter],
                        entityId: filter.id,
                    };
                };
            }
            var filterMaker2_2 = translateRelationFilter(relation);
            return function (userId) {
                var _a;
                var filter = filterMaker2_2(userId);
                (0, assert_1.default)(filter.id);
                return _a = {},
                    _a["".concat(paths[iter], "Id")] = filter.id,
                    _a;
            };
        }
        else {
            var filterMaker_1 = relation === 2 ? translateFilterMakerIter(paths[iter], iter + 1) : translateFilterMakerIter(relation, iter + 1);
            return function (userId) {
                var _a;
                return (_a = {},
                    _a[paths[iter]] = filterMaker_1(userId),
                    _a);
            };
        }
    };
    var filterMaker = paths.length ? translateFilterMakerIter(entity2, 0) : translateRelationFilter(entity2);
    if (!paths.length) {
        //  不可能是create
        return function (oper, userId) { return filterMaker(userId); };
    }
    /**
     * 针对第一层做一下特别优化，比如对象A指向对象B（多对一），如果A的cascadePath是 'B'，
     * 当create A时，会带有Bid。此时生成该B对象上的相关表达式查询返回，可以避免必须将此判定在对象创建之后再做
     * 另一使用场景是，在查询A时，如果带有Bid（在对象跳一对多子对象场景下很常见），可以提前判定这个查询对某些用户一定返回空集
     *
     * 20230306:
     * 在前台的权限判断中，会将list上的filter当成内在的限制对create动作进行判断，此时有一种可能是，filter并不能直接判断出外键，但会限制外键的查询范围。
     * 例如，在jichuang项目中，就存在park/list上，平台的用户去访问时，其查询条件是{ system: { platformId: 1 }}；而用户的关系落在system.platform.platformProvider上，
     * 此时如直接通过data上的外键判断就会失败，需要通过对filter上相应的语义解构，进行进一步的判断
     */
    var _a = tslib_1.__read(paths, 1), attr = _a[0];
    var relation = (0, relation_1.judgeRelation)(schema, entity2, attr);
    (0, assert_1.default)(relation === 2 || typeof relation === 'string');
    var filterMaker2 = paths.length > 1
        ? (relation === 2 ? translateFilterMakerIter(attr, 1) : translateFilterMakerIter(relation, 1))
        : (relation === 2 ? translateRelationFilter(attr) : translateRelationFilter(relation));
    var translateCreateFilterMaker = function (entity, filter, userId) {
        var counters = [];
        if (filter) {
            if (relation === 2) {
                if (filter.entity === attr && filter.entityId) {
                    // 这里对entityId的限定的数据只要和userId有一条relation，就不能否定可能会有创建动作（外键在最终create时，data上一定会有判定）
                    counters.push({
                        $entity: attr,
                        $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: filter.entityId }),
                    });
                }
                if (filter[attr]) {
                    counters.push({
                        $entity: attr,
                        $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), filter[attr]),
                    });
                }
            }
            else {
                (0, assert_1.default)(typeof relation === 'string');
                if (filter["".concat(attr, "Id")]) {
                    var filterMaker3 = paths.length > 1 ? translateFilterMakerIter(relation, 1) : translateRelationFilter(relation);
                    // 这里对attrId的限定的数据只要和userId有一条relation，就不能否定可能会有创建动作（外键在最终create时，data上一定会有判定）
                    counters.push({
                        $entity: relation,
                        $filter: (0, filter_1.addFilterSegment)(filterMaker3(userId), { id: filter["".concat(attr, "Id")] }),
                    });
                }
                if (filter[attr]) {
                    counters.push({
                        $entity: relation,
                        $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), filter[attr]),
                    });
                }
            }
            if (filter.$and) {
                var countersAnd = filter.$and.map(function (ele) { return translateCreateFilterMaker(entity, ele, userId); });
                // and 只要有一个满足就行
                var ca2 = countersAnd.filter(function (ele) { return !(ele instanceof Exception_1.OakUserUnpermittedException); });
                counters.push.apply(counters, tslib_1.__spreadArray([], tslib_1.__read(ca2), false));
            }
            if (filter.$or) {
                var countersOr = filter.$or.map(function (ele) { return translateCreateFilterMaker(entity, ele, userId); });
                // or也只要有一个满足就行（不能否定）
                var co2 = countersOr.filter(function (ele) { return !(ele instanceof Exception_1.OakUserUnpermittedException); });
                counters.push.apply(counters, tslib_1.__spreadArray([], tslib_1.__read(co2), false));
            }
        }
        if (counters.length === 0) {
            // 一个counter都找不出来，说明当前路径上不满足
            return new Exception_1.OakUserUnpermittedException();
        }
        else if (counters.length === 1) {
            return counters[0];
        }
        // 是or关系，只要其中有一个满足就可以通过
        return {
            $$or: counters,
        };
    };
    return function (operation, userId) {
        var action = operation.action;
        if (action === 'create') {
            var data = operation.data;
            if (data) {
                // 有data的情形根据data判定
                var getForeignKeyId_1 = function (d) {
                    if (relation === 2) {
                        if (d.entity === attr && typeof d.entityId === 'string') {
                            return d.entityId;
                        }
                        throw new Exception_1.OakUserUnpermittedException();
                    }
                    else {
                        (0, assert_1.default)(typeof relation === 'string');
                        if (typeof d["".concat(attr, "Id")] === 'string') {
                            return d["".concat(attr, "Id")];
                        }
                        throw new Exception_1.OakUserUnpermittedException();
                    }
                };
                if (relation === 2) {
                    if (data instanceof Array) {
                        var fkIds = (0, lodash_1.uniq)(data.map(function (d) { return getForeignKeyId_1(d); }));
                        return {
                            $entity: attr,
                            $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: { $in: fkIds } }),
                            $count: fkIds.length,
                        };
                    }
                    var fkId_1 = getForeignKeyId_1(data);
                    return {
                        $entity: attr,
                        $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: fkId_1 }),
                    };
                }
                (0, assert_1.default)(typeof relation === 'string');
                if (data instanceof Array) {
                    var fkIds = (0, lodash_1.uniq)(data.map(function (d) { return getForeignKeyId_1(d); }));
                    return {
                        $entity: relation,
                        $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: { $in: fkIds } }),
                        $count: fkIds.length,
                    };
                }
                var fkId = getForeignKeyId_1(data);
                return {
                    $entity: relation,
                    $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: fkId }),
                };
            }
            else {
                // todo
                var filter_4 = operation.filter;
                if (filter_4) {
                    var counter = translateCreateFilterMaker(entity2, filter_4, userId);
                    if (counter instanceof Exception_1.OakUserUnpermittedException) {
                        throw counter;
                    }
                    return counter;
                }
                throw new Exception_1.OakUserUnpermittedException();
            }
        }
        var filter = operation.filter;
        if (relation === 2 && (filter === null || filter === void 0 ? void 0 : filter.entity) === attr && (filter === null || filter === void 0 ? void 0 : filter.entityId)) {
            if (typeof filter.entityId === 'string') {
                return {
                    $entity: attr,
                    $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: filter.entityId }),
                };
            }
            else if (filter.entityId.$in && filter.entityId.$in instanceof Array) {
                var entityIds = (0, lodash_1.uniq)(filter.entityId.$in);
                return {
                    $entity: relation,
                    $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: { $in: entityIds } }),
                    $count: entityIds.length,
                };
            }
        }
        else if (filter && filter["".concat(attr, "Id")]) {
            if (typeof filter["".concat(attr, "Id")] === 'string') {
                return {
                    $entity: attr,
                    $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: filter["".concat(attr, "Id")] }),
                };
            }
            else if (filter["".concat(attr, "Id")].$in && filter["".concat(attr, "Id")].$in instanceof Array) {
                var entityIds = (0, lodash_1.uniq)(filter["".concat(attr, "Id")].$in);
                return {
                    $entity: relation,
                    $filter: (0, filter_1.addFilterSegment)(filterMaker2(userId), { id: { $in: entityIds } }),
                    $count: entityIds.length,
                };
            }
        }
        return filterMaker(userId);
    };
}
function translateActionAuthFilterMaker(schema, relationItem, entity, pathPrefix) {
    if (relationItem instanceof Array) {
        var maker = relationItem.map(function (ele) {
            if (ele instanceof Array) {
                return ele.map(function (ele2) { return translateCascadeRelationFilterMaker(schema, ele2, entity, pathPrefix); });
            }
            return translateCascadeRelationFilterMaker(schema, ele, entity, pathPrefix);
        });
        return maker;
    }
    var filterMaker = translateCascadeRelationFilterMaker(schema, relationItem, entity, pathPrefix);
    return filterMaker;
}
function execCreateCounter(context, counter) {
    if (counter === null || counter === void 0 ? void 0 : counter.$$and) {
        // 每个counter都要满足才能过
        var counters = counter === null || counter === void 0 ? void 0 : counter.$$and;
        (0, assert_1.default)(counters.length > 0);
        var counterResults = counters.map(function (ele) { return execCreateCounter(context, ele); });
        if (counterResults[0] instanceof Promise) {
            return Promise.all(counterResults)
                .then(function (cr2) {
                var unpermitted = cr2.find(function (ele) { return ele instanceof Exception_1.OakUserUnpermittedException; });
                if (unpermitted) {
                    return unpermitted;
                }
                return undefined;
            });
        }
        else {
            var unpermitted = counterResults.find(function (ele) { return ele instanceof Exception_1.OakUserUnpermittedException; });
            if (unpermitted) {
                return unpermitted;
            }
            else {
                return undefined;
            }
        }
    }
    else if (counter === null || counter === void 0 ? void 0 : counter.$$or) {
        // 只要有一个counter能过就算过
        var counters = counter === null || counter === void 0 ? void 0 : counter.$$or;
        (0, assert_1.default)(counters.length > 0);
        var counterResults = counters.map(function (ele) { return execCreateCounter(context, ele); });
        if (counterResults[0] instanceof Promise) {
            return Promise.all(counterResults)
                .then(function (cr2) {
                var permittedIdx = cr2.indexOf(undefined);
                if (permittedIdx !== -1) {
                    return undefined;
                }
                return new Exception_1.OakUserUnpermittedException();
            });
        }
        else {
            var permittedIndex = counterResults.indexOf(undefined);
            if (permittedIndex !== -1) {
                return undefined;
            }
            else {
                return new Exception_1.OakUserUnpermittedException();
            }
        }
    }
    else if (counter === null || counter === void 0 ? void 0 : counter.$entity) {
        var _a = counter, $entity = _a.$entity, $filter = _a.$filter, _b = _a.$count, $count_1 = _b === void 0 ? 1 : _b;
        var count = context.count($entity, {
            filter: $filter,
        }, { dontCollect: true });
        if (count instanceof Promise) {
            return count.then(function (c2) {
                if (c2 >= $count_1) {
                    return undefined;
                }
                return new Exception_1.OakUserUnpermittedException();
            });
        }
        else {
            return count >= $count_1 ? undefined : new Exception_1.OakUserUnpermittedException();
        }
    }
}
function makePotentialFilter(operation, context, filterMaker) {
    var e_1, _a, e_2, _b;
    var userId = context.getCurrentUserId();
    (0, assert_1.default)(userId);
    var filters = filterMaker instanceof Array ? filterMaker.map(function (ele) {
        if (ele instanceof Array) {
            return ele.map(function (ele2) { return ele2(operation, userId); });
        }
        return ele(operation, userId);
    }) : [filterMaker(operation, userId)];
    /**
     * 在下面的逻辑中，如果某个maker返回的是$entity类型，则检查是否有满足条件的项，没有就要抛出异常，有就返回undefined
     * undefined项即意味着该条件通过
     * 再加上and和or的布尔逻辑判断，得到最终结果
     * 还要考虑同步和异步……
     * 代码比较复杂，因为原先没有$entity这种返回结果的设计
     * by Xc 20130219
     */
    var filtersOr = [];
    var isAsyncOr = false;
    try {
        for (var filters_1 = tslib_1.__values(filters), filters_1_1 = filters_1.next(); !filters_1_1.done; filters_1_1 = filters_1.next()) {
            var f = filters_1_1.value;
            if (f instanceof Array) {
                var isAsyncAnd = false;
                (0, assert_1.default)(f.length > 0);
                var filtersAnd = [];
                try {
                    for (var f_1 = (e_2 = void 0, tslib_1.__values(f)), f_1_1 = f_1.next(); !f_1_1.done; f_1_1 = f_1.next()) {
                        var ff = f_1_1.value;
                        if ((ff === null || ff === void 0 ? void 0 : ff.$$and) || (ff === null || ff === void 0 ? void 0 : ff.$$or) || (ff === null || ff === void 0 ? void 0 : ff.$entity)) {
                            // 每个counter都要满足才能过
                            var result = execCreateCounter(context, ff);
                            if (result instanceof Promise) {
                                isAsyncAnd = true;
                            }
                            filtersAnd.push(result);
                        }
                        else if (ff) {
                            filtersAnd.push(ff);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (f_1_1 && !f_1_1.done && (_b = f_1.return)) _b.call(f_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                if (isAsyncAnd = true) {
                    isAsyncOr = true;
                    filtersOr.push(isAsyncAnd ? Promise.all(filtersAnd).then(function (fa) {
                        var e_3, _a;
                        var faR = [];
                        try {
                            for (var fa_1 = (e_3 = void 0, tslib_1.__values(fa)), fa_1_1 = fa_1.next(); !fa_1_1.done; fa_1_1 = fa_1.next()) {
                                var faItem = fa_1_1.value;
                                if (faItem instanceof Exception_1.OakUserUnpermittedException) {
                                    return faItem;
                                }
                                else if (faItem) {
                                    faR.push(faItem);
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (fa_1_1 && !fa_1_1.done && (_a = fa_1.return)) _a.call(fa_1);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        if (faR.length > 0) {
                            return {
                                $and: faR,
                            };
                        }
                    }) : {
                        $and: filtersAnd,
                    });
                }
            }
            else {
                if ((f === null || f === void 0 ? void 0 : f.$$and) || (f === null || f === void 0 ? void 0 : f.$$or) || (f === null || f === void 0 ? void 0 : f.$entity)) {
                    var counterResults = execCreateCounter(context, f);
                    if (counterResults instanceof Promise) {
                        isAsyncOr = true;
                    }
                    filtersOr.push(counterResults);
                }
                else if (f) {
                    filtersOr.push(f);
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (filters_1_1 && !filters_1_1.done && (_a = filters_1.return)) _a.call(filters_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // or的逻辑是，有一个成功就直接通过
    var returnOrFilters = function (filters) {
        if (filters.length === 0 || filters.includes(undefined)) {
            return undefined;
        }
        var foFilters = filters.filter(function (ele) { return ele !== undefined && !(ele instanceof Exception_1.OakUserUnpermittedException); });
        if (foFilters.length > 0) {
            return {
                $or: foFilters,
            };
        }
        throw new Exception_1.OakUserUnpermittedException();
    };
    if (isAsyncOr) {
        return Promise.all(filtersOr)
            .then(function (filters) { return returnOrFilters(filters); });
    }
    return returnOrFilters(filtersOr);
}
/**
 * 根据权限定义，创建出相应的checker
 * @param schema
 * @param authDict
 * @returns
 */
function createAuthCheckers(schema, authDict) {
    var checkers = [];
    var _loop_1 = function (entity) {
        var _a;
        if (authDict[entity]) {
            var _b = authDict[entity], relationAuth = _b.relationAuth, actionAuth = _b.actionAuth;
            if (relationAuth) {
                var raFilterMakerDict_1 = {};
                var userEntityName = "user".concat((0, string_1.firstLetterUpperCase)(entity));
                var allAuthItem = [];
                for (var r in relationAuth) {
                    var authItem = relationAuth[r];
                    Object.assign(raFilterMakerDict_1, (_a = {},
                        _a[r] = translateActionAuthFilterMaker(schema, authItem, userEntityName, entity),
                        _a));
                    if (authItem instanceof Array) {
                        allAuthItem.push.apply(allAuthItem, tslib_1.__spreadArray([], tslib_1.__read(authItem), false));
                    }
                    else {
                        allAuthItem.push(authItem);
                    }
                }
                // 如果不指定relation，则使用所有的authItem的or组合
                Object.assign(raFilterMakerDict_1, {
                    '@@all': translateActionAuthFilterMaker(schema, allAuthItem, userEntityName, entity),
                });
                var entityIdAttr_1 = "".concat(entity, "Id");
                checkers.push({
                    entity: userEntityName,
                    action: 'create',
                    type: 'relation',
                    relationFilter: function (operation, context) {
                        var data = operation.data;
                        (0, assert_1.default)(!(data instanceof Array));
                        var _a = data, relation = _a.relation, _b = entityIdAttr_1, entityId = _a[_b];
                        if (!relation) {
                            // 不指定relation测试是否有创建权限
                            return makePotentialFilter(operation, context, raFilterMakerDict_1['@@all']);
                        }
                        if (!raFilterMakerDict_1[relation]) {
                            throw new Exception_1.OakUserUnpermittedException();
                        }
                        var filter = makePotentialFilter(operation, context, raFilterMakerDict_1[relation]);
                        return filter;
                    },
                    errMsg: '越权操作',
                });
                checkers.push({
                    entity: userEntityName,
                    action: 'remove',
                    type: 'relation',
                    relationFilter: function (operation, context) {
                        // 目前过不去
                        return undefined;
                        /* const userId = context.getCurrentUserId();
                        const { filter } = operation as ED[keyof ED]['Remove'];
                        const makeFilterFromRows = (rows: Partial<ED[keyof ED]['Schema']>[]): SyncOrAsync<ED[keyof ED]['Selection']['filter']> => {
                            const relations = uniq(rows.map(ele => ele.relation));
                            const entityIds = uniq(rows.map(ele => ele[entityIdAttr]));
                            assert(entityIds.length === 1, `在回收${userEntityName}上权限时，单次回收涉及到了不同的对象，此操作不被允许`);
                            // const entityId = entityIds[0]!;

                            // 所有的relation条件要同时满足and关系（注意这里的filter翻译出来是在entity对象上，不是在userEntity对象上）
                            const filtersAnd = relations.map(
                                (relation) => raFilterMakerDict[relation!]
                            ).filter(
                                ele => !!ele
                            ).map(
                                ele => makePotentialFilter(operation, context, ele)
                            );
                            if (filtersAnd.find(ele => ele instanceof Promise)) {
                                return Promise.all(filtersAnd).then(
                                    (fa) => {
                                        if (fa.length > 0) {
                                            return {
                                                $and: fa,
                                            } as ED[keyof ED]['Selection']['filter'];
                                        }
                                    }
                                );
                            }
                            if (filtersAnd.length > 0) {
                                return {
                                    $and: filtersAnd
                                } as ED[keyof ED]['Selection']['filter'];
                            }
                        };

                        const toBeRemoved = context.select(userEntityName, {
                            data: {
                                id: 1,
                                relation: 1,
                                [entityIdAttr]: 1,
                            },
                            filter,
                        }, { dontCollect: true });
                        if (toBeRemoved instanceof Promise) {
                            return toBeRemoved.then(
                                (rows) => makeFilterFromRows(rows)
                            );
                        }
                        return makeFilterFromRows(toBeRemoved); */
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
                            var filter = makePotentialFilter(operation, context, filterMaker);
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
/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema
 * @returns
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
function createRemoveCheckers(schema, authDict) {
    var e_4, _a;
    var checkers = [];
    // 先建立所有的一对多的关系
    var OneToManyMatrix = {};
    var OneToManyOnEntityMatrix = {};
    var addToMto = function (e, f, attr) {
        var _a;
        if (OneToManyMatrix[f]) {
            (_a = OneToManyMatrix[f]) === null || _a === void 0 ? void 0 : _a.push([e, attr]);
        }
        else {
            OneToManyMatrix[f] = [[e, attr]];
        }
    };
    var addToMtoEntity = function (e, fs) {
        var e_5, _a;
        var _b;
        try {
            for (var fs_1 = tslib_1.__values(fs), fs_1_1 = fs_1.next(); !fs_1_1.done; fs_1_1 = fs_1.next()) {
                var f = fs_1_1.value;
                if (!OneToManyOnEntityMatrix[f]) {
                    OneToManyOnEntityMatrix[f] = [e];
                }
                else {
                    (_b = OneToManyOnEntityMatrix[f]) === null || _b === void 0 ? void 0 : _b.push(e);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (fs_1_1 && !fs_1_1.done && (_a = fs_1.return)) _a.call(fs_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
    };
    for (var entity in schema) {
        if (['operEntity', 'modiEntity', 'userEntityGrant'].includes(entity)) {
            continue; // 系统功能性数据，不用处理
        }
        var attributes = schema[entity].attributes;
        for (var attr in attributes) {
            if (attributes[attr].type === 'ref') {
                addToMto(entity, attributes[attr].ref, attr);
            }
            else if (attr === 'entity') {
                if (attributes[attr].ref) {
                    addToMtoEntity(entity, attributes[attr].ref);
                }
                else if (process.env.NODE_ENV === 'development') {
                    console.warn("".concat(entity, "\u7684entity\u53CD\u6307\u6307\u9488\u627E\u4E0D\u5230\u6709\u6548\u7684\u5BF9\u8C61"));
                }
            }
        }
    }
    // 当删除一时，要确认多上面没有指向一的数据
    var entities = (0, lodash_1.union)(Object.keys(OneToManyMatrix), Object.keys(OneToManyOnEntityMatrix));
    var _loop_3 = function (entity) {
        checkers.push({
            entity: entity,
            action: 'remove',
            type: 'logical',
            checker: function (operation, context, option) {
                var e_6, _a, e_7, _b;
                var promises = [];
                if (OneToManyMatrix[entity]) {
                    var _loop_5 = function (otm) {
                        var _g, _h;
                        var _j = tslib_1.__read(otm, 2), e = _j[0], attr = _j[1];
                        var proj = (_g = {
                                id: 1
                            },
                            _g[attr] = 1,
                            _g);
                        var filter = operation.filter && (_h = {},
                            _h[attr.slice(0, attr.length - 2)] = operation.filter,
                            _h);
                        var result = context.select(e, {
                            data: proj,
                            filter: filter,
                            indexFrom: 0,
                            count: 1
                        }, { dontCollect: true });
                        if (result instanceof Promise) {
                            promises.push(result.then(function (_a) {
                                var _b = tslib_1.__read(_a, 1), row = _b[0];
                                if (row) {
                                    var err = new Exception_1.OakRowInconsistencyException(undefined, "\u60A8\u65E0\u6CD5\u5220\u9664\u5B58\u5728\u6709\u6548\u6570\u636E\u300C".concat(e, "\u300D\u5173\u8054\u7684\u884C"));
                                    err.addData(e, [row]);
                                    throw err;
                                }
                            }));
                        }
                        else {
                            var _k = tslib_1.__read(result, 1), row = _k[0];
                            if (row) {
                                var err = new Exception_1.OakRowInconsistencyException(undefined, "\u60A8\u65E0\u6CD5\u5220\u9664\u5B58\u5728\u6709\u6548\u6570\u636E\u300C".concat(e, "\u300D\u5173\u8054\u7684\u884C"));
                                err.addData(e, [row]);
                                throw err;
                            }
                        }
                    };
                    try {
                        for (var _c = (e_6 = void 0, tslib_1.__values(OneToManyMatrix[entity])), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var otm = _d.value;
                            _loop_5(otm);
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                }
                if (OneToManyOnEntityMatrix[entity]) {
                    var _loop_6 = function (otm) {
                        var _l, _m, _o;
                        var proj = {
                            id: 1,
                            entity: 1,
                            entityId: 1,
                        };
                        var filter = operation.filter && (_l = {},
                            _l[entity] = operation.filter,
                            _l);
                        var result = context.select(otm, {
                            data: proj,
                            filter: filter,
                            indexFrom: 0,
                            count: 1
                        }, { dontCollect: true });
                        if (result instanceof Promise) {
                            promises.push(result.then(function (_a) {
                                var _b = tslib_1.__read(_a, 1), row = _b[0];
                                if (row) {
                                    var e = new Exception_1.OakRowInconsistencyException(undefined, "\u60A8\u65E0\u6CD5\u5220\u9664\u5B58\u5728\u6709\u6548\u6570\u636E\u300C".concat(otm, "\u300D\u5173\u8054\u7684\u884C"));
                                    e.addData(otm, [row]);
                                    throw e;
                                }
                            }));
                        }
                        else {
                            var _p = tslib_1.__read(result, 1), row = _p[0];
                            if (row) {
                                var record = {
                                    a: 's',
                                    d: (_m = {},
                                        _m[otm] = (_o = {},
                                            _o[row.id] = row,
                                            _o),
                                        _m)
                                };
                                var e = new Exception_1.OakRowInconsistencyException(undefined, "\u60A8\u65E0\u6CD5\u5220\u9664\u5B58\u5728\u6709\u6548\u6570\u636E\u300C".concat(otm, "\u300D\u5173\u8054\u7684\u884C"));
                                e.addData(otm, [row]);
                                throw e;
                            }
                        }
                    };
                    try {
                        for (var _e = (e_7 = void 0, tslib_1.__values(OneToManyOnEntityMatrix[entity])), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var otm = _f.value;
                            _loop_6(otm);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                }
                if (promises.length > 0) {
                    return Promise.all(promises).then(function () { return undefined; });
                }
            }
        });
    };
    try {
        for (var entities_1 = tslib_1.__values(entities), entities_1_1 = entities_1.next(); !entities_1_1.done; entities_1_1 = entities_1.next()) {
            var entity = entities_1_1.value;
            _loop_3(entity);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    var _loop_4 = function (entity) {
        var e_8, _b;
        var cascadeRemove = authDict[entity].cascadeRemove;
        if (cascadeRemove) {
            var entitiesOnEntityAttr = [];
            var hasAllEntity = false;
            var _loop_7 = function (attr) {
                if (attr === '@entity') {
                    hasAllEntity = true;
                    return "continue";
                }
                var rel = (0, relation_1.judgeRelation)(schema, entity, attr);
                if (rel === 2) {
                    entitiesOnEntityAttr.push(attr);
                    checkers.push({
                        entity: attr,
                        action: 'remove',
                        type: 'logical',
                        priority: types_1.REMOVE_CASCADE_PRIORITY,
                        checker: function (operation, context) {
                            var _a, _b;
                            var filter = operation.filter;
                            if (cascadeRemove[attr] === 'remove') {
                                return context.operate(entity, {
                                    id: (0, uuid_1.generateNewId)(),
                                    action: 'remove',
                                    data: {},
                                    filter: filter ? (_a = {},
                                        _a[attr] = filter,
                                        _a) : undefined,
                                }, { dontCollect: true });
                            }
                            return context.operate(entity, {
                                id: (0, uuid_1.generateNewId)(),
                                action: 'update',
                                data: {
                                    entity: null,
                                    entityId: null,
                                },
                                filter: filter ? (_b = {},
                                    _b[attr] = filter,
                                    _b) : undefined,
                            }, { dontCollect: true });
                        }
                    });
                }
                else {
                    (0, assert_1.default)(typeof rel === 'string');
                    checkers.push({
                        entity: rel,
                        action: 'remove',
                        type: 'logical',
                        priority: types_1.REMOVE_CASCADE_PRIORITY,
                        checker: function (operation, context) {
                            var _a, _b, _c;
                            var filter = operation.filter;
                            if (cascadeRemove[attr] === 'remove') {
                                return context.operate(entity, {
                                    id: (0, uuid_1.generateNewId)(),
                                    action: 'remove',
                                    data: {},
                                    filter: filter ? (_a = {},
                                        _a[attr] = filter,
                                        _a) : undefined,
                                }, { dontCollect: true });
                            }
                            return context.operate(entity, {
                                id: (0, uuid_1.generateNewId)(),
                                action: 'update',
                                data: (_b = {},
                                    _b["".concat(attr, "Id")] = null,
                                    _b),
                                filter: filter ? (_c = {},
                                    _c[attr] = filter,
                                    _c) : undefined,
                            }, { dontCollect: true });
                        }
                    });
                }
            };
            for (var attr in cascadeRemove) {
                _loop_7(attr);
            }
            if (hasAllEntity) {
                var attributes = schema[entity].attributes;
                var ref = attributes.entity.ref;
                var restEntities = (0, lodash_1.difference)(ref, entitiesOnEntityAttr);
                var _loop_8 = function (e) {
                    checkers.push({
                        entity: e,
                        action: 'remove',
                        type: 'logical',
                        priority: types_1.REMOVE_CASCADE_PRIORITY,
                        checker: function (operation, context) {
                            var _a, _b;
                            var filter = operation.filter;
                            if (cascadeRemove['@entity'] === 'remove') {
                                return context.operate(entity, {
                                    id: (0, uuid_1.generateNewId)(),
                                    action: 'remove',
                                    data: {},
                                    filter: filter ? (_a = {},
                                        _a[e] = filter,
                                        _a) : undefined,
                                }, { dontCollect: true });
                            }
                            return context.operate(entity, {
                                id: (0, uuid_1.generateNewId)(),
                                action: 'update',
                                data: {
                                    entity: null,
                                    entityId: null,
                                },
                                filter: filter ? (_b = {},
                                    _b[e] = filter,
                                    _b) : undefined,
                            }, { dontCollect: true });
                        }
                    });
                };
                try {
                    for (var restEntities_1 = (e_8 = void 0, tslib_1.__values(restEntities)), restEntities_1_1 = restEntities_1.next(); !restEntities_1_1.done; restEntities_1_1 = restEntities_1.next()) {
                        var e = restEntities_1_1.value;
                        _loop_8(e);
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (restEntities_1_1 && !restEntities_1_1.done && (_b = restEntities_1.return)) _b.call(restEntities_1);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
    };
    // 注入声明的cascade删除时的外键处理动作
    for (var entity in authDict) {
        _loop_4(entity);
    }
    return checkers;
}
exports.createRemoveCheckers = createRemoveCheckers;
function createCreateCheckers(schema) {
    var checkers = [];
    var _loop_9 = function (entity) {
        var attributes = schema[entity].attributes;
        var notNullAttrs = Object.keys(attributes).filter(function (ele) { return attributes[ele].notNull; });
        checkers.push({
            entity: entity,
            type: 'data',
            action: 'create',
            checker: function (data) {
                var checkData = function (data2) {
                    var e_9, _a, e_10, _b;
                    var illegalNullAttrs = (0, lodash_1.difference)(notNullAttrs, Object.keys(data2));
                    if (illegalNullAttrs.length > 0) {
                        try {
                            // 要处理多对一的cascade create
                            for (var illegalNullAttrs_1 = (e_9 = void 0, tslib_1.__values(illegalNullAttrs)), illegalNullAttrs_1_1 = illegalNullAttrs_1.next(); !illegalNullAttrs_1_1.done; illegalNullAttrs_1_1 = illegalNullAttrs_1.next()) {
                                var attr = illegalNullAttrs_1_1.value;
                                if (attr === 'entityId') {
                                    if (illegalNullAttrs.includes('entity')) {
                                        continue;
                                    }
                                }
                                else if (attr === 'entity' && attributes[attr].type === 'ref') {
                                    var hasCascadeCreate = false;
                                    try {
                                        for (var _c = (e_10 = void 0, tslib_1.__values(attributes[attr].ref)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                            var ref = _d.value;
                                            if (data2[ref] && data2[ref].action === 'create') {
                                                hasCascadeCreate = true;
                                                break;
                                            }
                                        }
                                    }
                                    catch (e_10_1) { e_10 = { error: e_10_1 }; }
                                    finally {
                                        try {
                                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                                        }
                                        finally { if (e_10) throw e_10.error; }
                                    }
                                    if (hasCascadeCreate) {
                                        continue;
                                    }
                                }
                                else if (attributes[attr].type === 'ref') {
                                    var ref = attributes[attr].ref;
                                    if (data2[ref] && data2[ref].action === 'create') {
                                        continue;
                                    }
                                }
                                // 到这里说明确实是有not null的属性没有赋值
                                throw new Exception_1.OakAttrNotNullException(entity, illegalNullAttrs);
                            }
                        }
                        catch (e_9_1) { e_9 = { error: e_9_1 }; }
                        finally {
                            try {
                                if (illegalNullAttrs_1_1 && !illegalNullAttrs_1_1.done && (_a = illegalNullAttrs_1.return)) _a.call(illegalNullAttrs_1);
                            }
                            finally { if (e_9) throw e_9.error; }
                        }
                    }
                    for (var attr in data2) {
                        if (attributes[attr]) {
                            var _e = attributes[attr], type = _e.type, params = _e.params, defaultValue = _e.default, enumeration = _e.enumeration;
                            switch (type) {
                                case 'char':
                                case 'varchar': {
                                    if (typeof data2[attr] !== 'string') {
                                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'not a string');
                                    }
                                    var length_1 = params.length;
                                    if (length_1 && data2[attr].length > length_1) {
                                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'too long');
                                    }
                                    break;
                                }
                                case 'int':
                                case 'smallint':
                                case 'tinyint':
                                case 'bigint':
                                case 'decimal':
                                case 'money': {
                                    if (typeof data2[attr] !== 'number') {
                                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'not a number');
                                    }
                                    var _f = params || {}, min = _f.min, max = _f.max;
                                    if (typeof min === 'number' && data2[attr] < min) {
                                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'too small');
                                    }
                                    if (typeof max === 'number' && data2[attr] > max) {
                                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'too big');
                                    }
                                    break;
                                }
                                case 'enum': {
                                    (0, assert_1.default)(enumeration);
                                    if (!enumeration.includes(data2[attr])) {
                                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'not in enumberation');
                                    }
                                    break;
                                }
                            }
                        }
                    }
                };
                if (data instanceof Array) {
                    data.forEach(function (ele) { return checkData(ele); });
                }
                else {
                    checkData(data);
                }
            }
        });
    };
    for (var entity in schema) {
        _loop_9(entity);
    }
    return checkers;
}
exports.createCreateCheckers = createCreateCheckers;
