"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreateCheckers = exports.createRemoveCheckers = exports.translateCheckerInSyncContext = exports.translateCheckerInAsyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var filter_1 = require("../store/filter");
var Exception_1 = require("../types/Exception");
var types_1 = require("../types");
var actionDef_1 = require("./actionDef");
var lodash_1 = require("../utils/lodash");
var action_1 = require("../actions/action");
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
                    var result, _b, filter, action, errMsg2;
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
                                errMsg2 = typeof errMsg_2 === 'function' ? errMsg_2(operation, context, option) : errMsg_2;
                                throw new Exception_1.OakUserUnpermittedException(errMsg2);
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
                    var errMsg2 = typeof errMsg_4 === 'function' ? errMsg_4(operation, context, option) : errMsg_4;
                    throw new Exception_1.OakUserUnpermittedException(errMsg2);
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
/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema
 * @returns
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
function createRemoveCheckers(schema) {
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
    var _loop_1 = function (entity) {
        checkers.push({
            entity: entity,
            action: 'remove',
            type: 'logical',
            priority: types_1.CHECKER_MAX_PRIORITY,
            checker: function (operation, context, option) {
                var e_3, _a, e_4, _b;
                var promises = [];
                if (OneToManyMatrix[entity]) {
                    var _loop_2 = function (otm) {
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
                            _loop_2(otm);
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
                    var _loop_3 = function (otm) {
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
                            _loop_3(otm);
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
            _loop_1(entity);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return checkers;
}
exports.createRemoveCheckers = createRemoveCheckers;
function checkAttributeLegal(schema, entity, data) {
    var _a;
    var _b;
    var attributes = schema[entity].attributes;
    for (var attr in data) {
        if (attributes[attr]) {
            var _c = attributes[attr], type = _c.type, params = _c.params, defaultValue = _c.default, enumeration = _c.enumeration, notNull = _c.notNull;
            if (data[attr] === null || data[attr] === undefined) {
                if (notNull && defaultValue === undefined) {
                    throw new Exception_1.OakAttrNotNullException(entity, [attr]);
                }
                if (defaultValue !== undefined) {
                    Object.assign(data, (_a = {},
                        _a[attr] = defaultValue,
                        _a));
                }
                continue;
            }
            switch (type) {
                case 'char':
                case 'varchar': {
                    if (typeof data[attr] !== 'string') {
                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'not a string');
                    }
                    var length_1 = params.length;
                    if (length_1 && data[attr].length > length_1) {
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
                    if (typeof data[attr] !== 'number') {
                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'not a number');
                    }
                    var _d = params || {}, min = _d.min, max = _d.max;
                    if (typeof min === 'number' && data[attr] < min) {
                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'too small');
                    }
                    if (typeof max === 'number' && data[attr] > max) {
                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'too big');
                    }
                    break;
                }
                case 'enum': {
                    (0, assert_1.default)(enumeration);
                    if (!enumeration.includes(data[attr])) {
                        throw new Exception_1.OakInputIllegalException(entity, [attr], 'not in enumberation');
                    }
                    break;
                }
            }
        }
        else {
            // 这里似乎还有一种update中带cascade remove的case，等遇到再说（貌似cascadeUpdate没有处理完整这种情况） by Xc
            if (typeof data[attr] === 'object' && ((_b = data[attr]) === null || _b === void 0 ? void 0 : _b.action) === 'remove') {
                console.warn('cascade remove可能是未处理的边界，请注意');
            }
        }
    }
}
function createCreateCheckers(schema) {
    var checkers = [];
    var _loop_4 = function (entity) {
        var _a = schema[entity], attributes = _a.attributes, actions = _a.actions;
        var notNullAttrs = Object.keys(attributes).filter(function (ele) { return attributes[ele].notNull; });
        var updateActions = (0, lodash_1.difference)(actions, action_1.excludeUpdateActions);
        checkers.push({
            entity: entity,
            type: 'data',
            action: 'create',
            checker: function (data) {
                var checkData = function (data2) {
                    var e_5, _a, e_6, _b;
                    var illegalNullAttrs = (0, lodash_1.difference)(notNullAttrs, Object.keys(data2));
                    if (illegalNullAttrs.length > 0) {
                        try {
                            // 要处理多对一的cascade create
                            for (var illegalNullAttrs_1 = (e_5 = void 0, tslib_1.__values(illegalNullAttrs)), illegalNullAttrs_1_1 = illegalNullAttrs_1.next(); !illegalNullAttrs_1_1.done; illegalNullAttrs_1_1 = illegalNullAttrs_1.next()) {
                                var attr = illegalNullAttrs_1_1.value;
                                if (attr === 'entityId') {
                                    if (illegalNullAttrs.includes('entity')) {
                                        continue;
                                    }
                                }
                                else if (attr === 'entity' && attributes[attr].ref) {
                                    var hasCascadeCreate = false;
                                    try {
                                        for (var _c = (e_6 = void 0, tslib_1.__values(attributes[attr].ref)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                            var ref = _d.value;
                                            if (data2[ref] && data2[ref].action === 'create') {
                                                hasCascadeCreate = true;
                                                break;
                                            }
                                        }
                                    }
                                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                                    finally {
                                        try {
                                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                                        }
                                        finally { if (e_6) throw e_6.error; }
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
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (illegalNullAttrs_1_1 && !illegalNullAttrs_1_1.done && (_a = illegalNullAttrs_1.return)) _a.call(illegalNullAttrs_1);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                    checkAttributeLegal(schema, entity, data2);
                };
                if (data instanceof Array) {
                    data.forEach(function (ele) { return checkData(ele); });
                }
                else {
                    checkData(data);
                }
            }
        }, {
            entity: entity,
            type: 'data',
            action: updateActions,
            checker: function (data) {
                checkAttributeLegal(schema, entity, data);
            }
        });
    };
    for (var entity in schema) {
        _loop_4(entity);
    }
    return checkers;
}
exports.createCreateCheckers = createCreateCheckers;
