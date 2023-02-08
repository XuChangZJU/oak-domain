"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRemoveCheckers = exports.createAuthCheckers = exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
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
                    var e = new Exception_1.OakRowInconsistencyException(undefined, errMsg_3);
                    throw e;
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
                var userEntityName_1 = "user".concat((0, string_1.firstLetterUpperCase)(entity));
                for (var r in relationAuth) {
                    Object.assign(raFilterMakerDict_1, (_a = {},
                        _a[r] = translateActionAuthFilterMaker(schema, relationAuth[r], entity),
                        _a));
                }
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
/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema
 * @returns
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
function createRemoveCheckers(schema, authDict) {
    var e_1, _a;
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
        var e_2, _a;
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (fs_1_1 && !fs_1_1.done && (_a = fs_1.return)) _a.call(fs_1);
            }
            finally { if (e_2) throw e_2.error; }
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
                var e_3, _a, e_4, _b;
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
                        for (var _c = (e_3 = void 0, tslib_1.__values(OneToManyMatrix[entity])), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var otm = _d.value;
                            _loop_5(otm);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                        }
                        finally { if (e_3) throw e_3.error; }
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
                        for (var _e = (e_4 = void 0, tslib_1.__values(OneToManyOnEntityMatrix[entity])), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var otm = _f.value;
                            _loop_6(otm);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_4) throw e_4.error; }
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
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var _loop_4 = function (entity) {
        var e_5, _b;
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
                    for (var restEntities_1 = (e_5 = void 0, tslib_1.__values(restEntities)), restEntities_1_1 = restEntities_1.next(); !restEntities_1_1.done; restEntities_1_1 = restEntities_1.next()) {
                        var e = restEntities_1_1.value;
                        _loop_8(e);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (restEntities_1_1 && !restEntities_1_1.done && (_b = restEntities_1.return)) _b.call(restEntities_1);
                    }
                    finally { if (e_5) throw e_5.error; }
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
