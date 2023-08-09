"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIntrinsicCTWs = exports.getFullProjection = void 0;
var tslib_1 = require("tslib");
var types_1 = require("../types");
var lodash_1 = require("../utils/lodash");
var filter_1 = require("./filter");
var checkers_1 = require("../checkers");
var triggers_1 = require("../triggers");
var actionAuth_1 = require("./actionAuth");
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
function makeIntrinsicWatchers(schema) {
    var watchers = [];
    for (var entity in schema) {
        var attributes = schema[entity].attributes;
        var expiresAt = attributes.expiresAt, expired = attributes.expired;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity: entity,
                name: "\u5BF9\u8C61".concat(entity, "\u4E0A\u7684\u8FC7\u671F\u81EA\u52A8watcher"),
                filter: function () {
                    return {
                        expired: false,
                        expiresAt: {
                            $lte: Date.now(),
                        },
                    };
                },
                action: 'update',
                actionData: {
                    expired: true,
                },
            });
        }
    }
    return watchers;
}
function checkUniqueBetweenRows(rows, uniqAttrs) {
    var e_1, _a, e_2, _b;
    // 先检查这些行本身之间有无unique冲突
    var dict = {};
    try {
        for (var rows_1 = tslib_1.__values(rows), rows_1_1 = rows_1.next(); !rows_1_1.done; rows_1_1 = rows_1.next()) {
            var row = rows_1_1.value;
            var s = '';
            try {
                for (var uniqAttrs_1 = (e_2 = void 0, tslib_1.__values(uniqAttrs)), uniqAttrs_1_1 = uniqAttrs_1.next(); !uniqAttrs_1_1.done; uniqAttrs_1_1 = uniqAttrs_1.next()) {
                    var a = uniqAttrs_1_1.value;
                    if (row[a] === null || row[a] === undefined) {
                        s + row.id;
                    }
                    else {
                        s + "-".concat(row[a]);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (uniqAttrs_1_1 && !uniqAttrs_1_1.done && (_b = uniqAttrs_1.return)) _b.call(uniqAttrs_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (dict[s]) {
                throw new types_1.OakUniqueViolationException([{
                        id: row.id,
                        attrs: uniqAttrs,
                    }]);
            }
            else {
                dict[s] = 1;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (rows_1_1 && !rows_1_1.done && (_a = rows_1.return)) _a.call(rows_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
function checkCountLessThan(count, uniqAttrs, than, id) {
    if (than === void 0) { than = 0; }
    if (count instanceof Promise) {
        return count.then(function (count2) {
            if (count2 > than) {
                throw new types_1.OakUniqueViolationException([{
                        id: id,
                        attrs: uniqAttrs,
                    }]);
            }
        });
    }
    if (count > than) {
        throw new types_1.OakUniqueViolationException([{
                id: id,
                attrs: uniqAttrs,
            }]);
    }
}
function checkUnique(entity, row, context, uniqAttrs, extraFilter) {
    var filter = (0, lodash_1.pick)(row, uniqAttrs);
    for (var a in filter) {
        if (filter[a] === null || filter[a] === undefined) {
            delete filter[a];
        }
    }
    if (Object.keys(filter).length < uniqAttrs.length) {
        // 说明有null值，不需要检查约束
        return;
    }
    var filter2 = extraFilter ? (0, filter_1.combineFilters)(entity, context.getSchema(), [filter, extraFilter]) : filter;
    var count = context.count(entity, { filter: filter2 }, { dontCollect: true });
    return checkCountLessThan(count, uniqAttrs, 0, row.id);
}
function makeIntrinsicCTWs(schema, actionDefDict) {
    var _a;
    var checkers = (0, checkers_1.createDynamicCheckers)(schema);
    var triggers = (0, triggers_1.createDynamicTriggers)(schema);
    // action状态转换矩阵相应的checker
    for (var entity in actionDefDict) {
        var _loop_1 = function (attr) {
            var def = actionDefDict[entity][attr];
            var _b = def, stm = _b.stm, is = _b.is;
            var _loop_3 = function (action) {
                var _c, _d;
                var actionStm = stm[action];
                var conditionalFilter = typeof actionStm[0] === 'string' ? (_c = {},
                    _c[attr] = actionStm[0],
                    _c) : (_d = {},
                    _d[attr] = {
                        $in: actionStm[0],
                    },
                    _d);
                checkers.push({
                    action: action,
                    type: 'row',
                    entity: entity,
                    filter: conditionalFilter,
                    errMsg: '',
                });
                // 这里用data类型的checker改数据了不太好，先这样
                checkers.push({
                    action: action,
                    type: 'data',
                    entity: entity,
                    checker: function (data) {
                        var _a;
                        Object.assign(data, (_a = {},
                            _a[attr] = stm[action][1],
                            _a));
                    }
                });
            };
            for (var action in stm) {
                _loop_3(action);
            }
            if (is) {
                checkers.push({
                    action: 'create',
                    type: 'data',
                    entity: entity,
                    priority: 10,
                    checker: function (data) {
                        var _a;
                        if (data instanceof Array) {
                            data.forEach(function (ele) {
                                var _a;
                                if (!ele[attr]) {
                                    Object.assign(ele, (_a = {},
                                        _a[attr] = is,
                                        _a));
                                }
                            });
                        }
                        else {
                            if (!data[attr]) {
                                Object.assign(data, (_a = {},
                                    _a[attr] = is,
                                    _a));
                            }
                        }
                    }
                });
            }
        };
        for (var attr in actionDefDict[entity]) {
            _loop_1(attr);
        }
    }
    var _loop_2 = function (entity) {
        var e_3, _e;
        var indexes = schema[entity].indexes;
        if (indexes) {
            var _loop_4 = function (index) {
                if ((_a = index.config) === null || _a === void 0 ? void 0 : _a.unique) {
                    var attributes = index.attributes;
                    var uniqAttrs_2 = attributes.map(function (ele) { return ele.name; });
                    checkers.push({
                        entity: entity,
                        action: 'create',
                        type: 'logical',
                        priority: types_1.CHECKER_MAX_PRIORITY,
                        checker: function (operation, context) {
                            var data = operation.data;
                            if (data instanceof Array) {
                                checkUniqueBetweenRows(data, uniqAttrs_2);
                                var checkResult = data.map(function (ele) { return checkUnique(entity, ele, context, uniqAttrs_2); });
                                if (checkResult[0] instanceof Promise) {
                                    return Promise.all(checkResult).then(function () { return undefined; });
                                }
                            }
                            else {
                                return checkUnique(entity, data, context, uniqAttrs_2);
                            }
                        }
                    }, {
                        entity: entity,
                        action: 'update',
                        type: 'logical',
                        priority: types_1.CHECKER_MAX_PRIORITY,
                        checker: function (operation, context) {
                            var e_4, _a, e_5, _b, _c;
                            var _d = operation, data = _d.data, operationFilter = _d.filter;
                            var attrs = Object.keys(data);
                            var refAttrs = (0, lodash_1.intersection)(attrs, uniqAttrs_2);
                            if (refAttrs.length === 0) {
                                // 如果本次更新和unique约束的属性之间没有交集则直接返回
                                return;
                            }
                            try {
                                for (var refAttrs_1 = (e_4 = void 0, tslib_1.__values(refAttrs)), refAttrs_1_1 = refAttrs_1.next(); !refAttrs_1_1.done; refAttrs_1_1 = refAttrs_1.next()) {
                                    var attr = refAttrs_1_1.value;
                                    // 如果有更新为null值，不用再检查约束
                                    if (data[attr] === null || data[attr] === undefined) {
                                        return;
                                    }
                                }
                            }
                            catch (e_4_1) { e_4 = { error: e_4_1 }; }
                            finally {
                                try {
                                    if (refAttrs_1_1 && !refAttrs_1_1.done && (_a = refAttrs_1.return)) _a.call(refAttrs_1);
                                }
                                finally { if (e_4) throw e_4.error; }
                            }
                            if (refAttrs.length === uniqAttrs_2.length) {
                                // 如果更新了全部属性，直接检查
                                var filter = (0, lodash_1.pick)(data, refAttrs);
                                // 在这些行以外的行不和更新后的键值冲突
                                var count = context.count(entity, {
                                    filter: (0, filter_1.combineFilters)(entity, context.getSchema(), [filter, {
                                            $not: operationFilter,
                                        }]),
                                }, { dontCollect: true });
                                var checkCount = checkCountLessThan(count, uniqAttrs_2, 0, operationFilter === null || operationFilter === void 0 ? void 0 : operationFilter.id);
                                // 更新的行只能有一行
                                var rowCount = context.count(entity, {
                                    filter: operationFilter,
                                }, { dontCollect: true });
                                var checkRowCount = checkCountLessThan(rowCount, uniqAttrs_2, 1, operationFilter === null || operationFilter === void 0 ? void 0 : operationFilter.id);
                                // 如果更新的行数为零似乎也可以，但这应该不可能出现吧，by Xc 20230131
                                if (checkRowCount instanceof Promise) {
                                    return Promise.all([checkCount, checkRowCount]).then(function () { return undefined; });
                                }
                            }
                            // 否则需要结合本行现有的属性来进行检查
                            var projection = { id: 1 };
                            try {
                                for (var uniqAttrs_3 = (e_5 = void 0, tslib_1.__values(uniqAttrs_2)), uniqAttrs_3_1 = uniqAttrs_3.next(); !uniqAttrs_3_1.done; uniqAttrs_3_1 = uniqAttrs_3.next()) {
                                    var attr = uniqAttrs_3_1.value;
                                    Object.assign(projection, (_c = {},
                                        _c[attr] = 1,
                                        _c));
                                }
                            }
                            catch (e_5_1) { e_5 = { error: e_5_1 }; }
                            finally {
                                try {
                                    if (uniqAttrs_3_1 && !uniqAttrs_3_1.done && (_b = uniqAttrs_3.return)) _b.call(uniqAttrs_3);
                                }
                                finally { if (e_5) throw e_5.error; }
                            }
                            var checkWithRows = function (rows2) {
                                var rows22 = rows2.map(function (ele) { return Object.assign(ele, data); });
                                // 先检查这些行本身之间是否冲突
                                checkUniqueBetweenRows(rows22, uniqAttrs_2);
                                var checkResults = rows22.map(function (row) { return checkUnique(entity, row, context, uniqAttrs_2, {
                                    $not: operationFilter
                                }); });
                                if (checkResults[0] instanceof Promise) {
                                    return Promise.all(checkResults).then(function () { return undefined; });
                                }
                            };
                            var currentRows = context.select(entity, {
                                data: projection,
                                filter: operationFilter,
                            }, { dontCollect: true });
                            if (currentRows instanceof Promise) {
                                return currentRows.then(function (row2) { return checkWithRows(row2); });
                            }
                            return checkWithRows(currentRows);
                        }
                    });
                }
            };
            try {
                for (var indexes_1 = (e_3 = void 0, tslib_1.__values(indexes)), indexes_1_1 = indexes_1.next(); !indexes_1_1.done; indexes_1_1 = indexes_1.next()) {
                    var index = indexes_1_1.value;
                    _loop_4(index);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (indexes_1_1 && !indexes_1_1.done && (_e = indexes_1.return)) _e.call(indexes_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    };
    // unique索引相应的checker
    for (var entity in schema) {
        _loop_2(entity);
    }
    triggers.push.apply(triggers, tslib_1.__spreadArray([], tslib_1.__read(actionAuth_1.triggers), false));
    return {
        triggers: triggers,
        checkers: checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}
exports.makeIntrinsicCTWs = makeIntrinsicCTWs;
