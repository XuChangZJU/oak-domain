"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationAuth = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var AsyncRowStore_1 = require("./AsyncRowStore");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var RelationAuth = /** @class */ (function () {
    function RelationAuth(schema, actionCascadePathGraph, relationCascadePathGraph, authDeduceRelationMap) {
        this.directActionAuthMap = {};
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.relationalFilterMaker = {};
        this.relationalCreateChecker = {};
        this.authDeduceRelationMap = authDeduceRelationMap;
        this.constructFilterMaker();
    }
    RelationAuth.prototype.constructFilterMaker = function () {
        var _this = this;
        var pathGroup = {};
        this.actionCascadePathGraph.forEach(function (path) {
            var _a;
            var entity = path[0];
            if (pathGroup[entity]) {
                (_a = pathGroup[entity]) === null || _a === void 0 ? void 0 : _a.push(path);
            }
            else {
                pathGroup[entity] = [path];
            }
        });
        var makeUserRelationSelection = function (entity, path, root, action, userId) { return ({
            data: {
                entityId: 1,
            },
            filter: {
                userId: userId,
                entity: root,
                relationId: {
                    $in: {
                        entity: 'actionAuth',
                        data: {
                            relationId: 1,
                        },
                        filter: {
                            path: path,
                            destEntity: entity,
                            destActions: {
                                $contains: action,
                            },
                        },
                    },
                },
            },
        }); };
        var makeIter = function (paths, ir, daKey, e, p, r, e2, idx) {
            var rel = (0, relation_1.judgeRelation)(_this.schema, e2, paths[idx]);
            if (idx === paths.length - 1) {
                if (rel === 2) {
                    // 基于entity/entityId的外键
                    if (ir) {
                        return function (action, userId) { return ({
                            entity: paths[idx],
                            entityId: {
                                $in: tslib_1.__assign({ entity: 'userRelation' }, makeUserRelationSelection(e, p, r, action, userId)),
                            },
                        }); };
                    }
                    else {
                        return function (action, userId, directActionAuthMap) {
                            if (directActionAuthMap[daKey].includes(action)) {
                                return {
                                    entity: 'user',
                                    entityId: userId,
                                };
                            }
                        };
                    }
                }
                else {
                    (0, assert_1.default)(typeof rel === 'string');
                    if (ir) {
                        return function (action, userId) {
                            var _a;
                            return (_a = {},
                                _a["".concat(rel, "Id")] = {
                                    $in: tslib_1.__assign({ entity: 'userRelation' }, makeUserRelationSelection(e, p, r, action, userId)),
                                },
                                _a);
                        };
                    }
                    else {
                        return function (action, userId, directActionAuthMap) {
                            var _a;
                            if (directActionAuthMap[daKey].includes(action)) {
                                return _a = {},
                                    _a["".concat(rel, "Id")] = userId,
                                    _a;
                            }
                        };
                    }
                }
            }
            (0, assert_1.default)(rel === 2 || typeof rel === 'string');
            var maker = makeIter(paths, ir, daKey, e, p, r, rel === 2 ? paths[idx] : rel, idx + 1);
            return function (action, userId, directActionAuthMap) {
                var _a;
                return (_a = {},
                    _a[paths[idx]] = maker(action, userId, directActionAuthMap),
                    _a);
            };
        };
        var _loop_1 = function (entity) {
            /* if (pathGroup[entity]!.length > 6) {
                throw new Error(`${entity as string}上的actionPath数量大于6，请优化}`);
            } */
            var filterMakers = pathGroup[entity].map(function (ele) {
                var _a = tslib_1.__read(ele, 4), e = _a[0], p = _a[1], r = _a[2], ir = _a[3]; // entity, path, root, isRelation
                var daKey = "".concat(e, "-").concat(p, "-").concat(r);
                var paths = p.split('.');
                if (!p) {
                    (0, assert_1.default)(ir);
                    return function (action, userId) { return ({
                        id: {
                            $in: tslib_1.__assign({ entity: 'userRelation' }, makeUserRelationSelection(e, p, r, action, userId)),
                        },
                    }); };
                }
                return makeIter(paths, ir, daKey, e, p, r, e, 0);
            });
            this_1.relationalFilterMaker[entity] = function (action, userId, directActionAuthMap) {
                var filters = filterMakers.map(function (ele) { return ele(action, userId, directActionAuthMap); }).filter(function (ele) { return !!ele; });
                if (filters.length > 1) {
                    return {
                        $or: filters,
                    };
                }
                else if (filters.length === 1) {
                    return filters[0];
                }
                // 说明找不到对应的定义，此操作没有可能的相应权限
                throw new types_1.OakNoRelationDefException(entity, action);
            };
            var createCheckers = pathGroup[entity].map(function (ele) {
                var _a = tslib_1.__read(ele, 4), e = _a[0], p = _a[1], r = _a[2], ir = _a[3]; // entity, path, root, isRelation
                var daKey = "".concat(e, "-").concat(p, "-").concat(r);
                var paths = p.split('.');
                if (!p) {
                    (0, assert_1.default)(ir);
                    // 直接关联在本对象上，所以应该是create时直接创建出对应的relation
                    return function (userId, directActionAuth, data, filter) {
                        if (data) {
                            var id_1 = data.id;
                            return function (context) {
                                // 只对后台需要创建，前台直接返回
                                if (context instanceof AsyncRowStore_1.AsyncContext) {
                                    var assignPossibleRelation_1 = function (aas) {
                                        if (aas.length > 0) {
                                            (0, assert_1.default)(aas.length === 1, "\u5728".concat(e, "\u4E0A\u7684\u81EA\u8EAB\u5173\u7CFB\u4E0A\u5B9A\u4E49\u4E86\u8D85\u8FC7\u4E00\u79CDcreate\u7684\u6743\u9650\uFF0C\u300C").concat(aas.map(function (ele) { return ele.relation.name; }).join(','), "\u300D"));
                                            var relationId = aas[0].relationId;
                                            Object.assign(data, {
                                                userRelation$entity: {
                                                    action: 'create',
                                                    data: {
                                                        entity: e,
                                                        entityId: id_1,
                                                        relationId: relationId,
                                                        userId: userId,
                                                    }
                                                }
                                            });
                                            return true;
                                        }
                                        return false;
                                    };
                                    return context.select('actionAuth', {
                                        data: {
                                            id: 1,
                                            relationId: 1,
                                            destEntity: 1,
                                            relation: {
                                                id: 1,
                                                name: 1,
                                            },
                                        },
                                        filter: {
                                            path: '',
                                            deActions: {
                                                $contains: 'create',
                                            },
                                            relation: {
                                                entity: e,
                                            },
                                        },
                                    }, {}).then(function (actionAuths) { return assignPossibleRelation_1(actionAuths); }).then(function () { return true; });
                                }
                                return true;
                            };
                        }
                        return function () { return true; };
                    };
                }
                if (paths.length === 1 && !ir) {
                    // 同样是直接关联在本对象上，在create的时候直接赋予userId
                    var rel_1 = (0, relation_1.judgeRelation)(_this.schema, e, paths[0]);
                    return function (userId, directActionAuth, data, filter) {
                        if (data) {
                            return function (context) {
                                var _a;
                                if (context instanceof AsyncRowStore_1.AsyncContext) {
                                    if (rel_1 === 2) {
                                        Object.assign(data, {
                                            entity: 'user',
                                            entityId: userId,
                                        });
                                    }
                                    else {
                                        (0, assert_1.default)(typeof rel_1 === 'string');
                                        Object.assign(data, (_a = {},
                                            _a["".concat(paths[0], "Id")] = userId,
                                            _a));
                                    }
                                }
                                return true;
                            };
                        }
                        return function () { return true; };
                    };
                }
                var translateFilterToSelect = function (e2, filter, idx, userId, directActionAuthMap) {
                    if (idx === paths.length - 1) {
                        /**
                         * 如果path是a.b.c，而filter是
                         * { a: { b: { c: {...} }}}
                         * 则最多只能解构成对b上的查询(makeIter只能到b)
                         */
                        var relationalFilter = makeIter(paths, ir, daKey, e, p, r, e2, idx)('create', userId, directActionAuthMap);
                        return {
                            entity: e2,
                            filter: filter,
                            relationalFilter: relationalFilter,
                        };
                    }
                    var attr = paths[idx];
                    var rel = (0, relation_1.judgeRelation)(_this.schema, e2, attr);
                    (0, assert_1.default)(rel === 2 || typeof rel === 'string');
                    if (filter[attr]) {
                        (0, assert_1.default)(typeof filter[attr] === 'object');
                        return translateFilterToSelect(rel === 2 ? attr : rel, filter[attr], idx + 1, userId, directActionAuthMap);
                    }
                    else if (rel === 2) {
                        if (filter.entity === attr && filter.entityId) {
                            return {
                                entity: attr,
                                filter: {
                                    id: filter.entityId,
                                },
                                relationalFilter: makeIter(paths, ir, daKey, e, p, r, attr, idx + 1)('create', userId, directActionAuthMap),
                            };
                        }
                    }
                    else {
                        if (filter["".concat(attr, "Id")]) {
                            return {
                                entity: rel,
                                filter: {
                                    id: filter["".concat(attr, "Id")],
                                },
                                relationalFilter: makeIter(paths, ir, daKey, e, p, r, rel, idx + 1)('create', userId, directActionAuthMap),
                            };
                        }
                    }
                    return; // 说明不可能从filter来界定了
                };
                // 其它情况都是检查其data或者filter中的外键指向是否满足relation约束关系
                return function (userId, directActionAuthMap, data, filter) {
                    if (!filter && !data) {
                        return false;
                    }
                    var result = translateFilterToSelect(e, (filter || data), 0, userId, directActionAuthMap);
                    if (!result) {
                        return false;
                    }
                    return function (context) {
                        var entity = result.entity, filter = result.filter, relationalFilter = result.relationalFilter;
                        return (0, filter_1.checkFilterContains)(entity, context, relationalFilter, filter);
                    };
                };
            });
            this_1.relationalCreateChecker[entity] = function (userId, directActionAuthMap, data, filter) {
                var callbacks = createCheckers.map(function (ele) { return ele(userId, directActionAuthMap, data, filter); }).filter(function (ele) { return typeof ele === 'function'; });
                if (callbacks.length > 6) {
                    throw new types_1.OakDataException("\u5728create\u300C".concat(entity, "\u300D\u65F6relation\u76F8\u5173\u7684\u6743\u9650\u68C0\u67E5\u8FC7\u591A\uFF0C\u8BF7\u4F18\u5316actionAuth\u7684\u8DEF\u5F84"));
                }
                return function (context) {
                    var result = callbacks.map(function (ele) { return ele(context); });
                    // 回调中只要有一个通过就算过
                    if (context instanceof AsyncRowStore_1.AsyncContext) {
                        return Promise.all(result).then(function (r) {
                            if (r.includes(true)) {
                                return;
                            }
                            throw new types_1.OakUserUnpermittedException();
                        });
                    }
                    if (result.includes(true)) {
                        return;
                    }
                    throw new types_1.OakUserUnpermittedException();
                };
            };
        };
        var this_1 = this;
        for (var entity in pathGroup) {
            _loop_1(entity);
        }
    };
    RelationAuth.prototype.makeDirectionActionAuthMap = function (directActionAuths) {
        var e_1, _a;
        var directActionAuthMap = {};
        try {
            for (var directActionAuths_1 = tslib_1.__values(directActionAuths), directActionAuths_1_1 = directActionAuths_1.next(); !directActionAuths_1_1.done; directActionAuths_1_1 = directActionAuths_1.next()) {
                var auth = directActionAuths_1_1.value;
                var deActions = auth.deActions, destEntity = auth.destEntity, sourceEntity = auth.sourceEntity, path = auth.path;
                var k = "$".concat(destEntity, "-").concat(path, "-").concat(sourceEntity);
                directActionAuthMap[k] = deActions;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (directActionAuths_1_1 && !directActionAuths_1_1.done && (_a = directActionAuths_1.return)) _a.call(directActionAuths_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return directActionAuthMap;
    };
    RelationAuth.prototype.setDirectionActionAuths = function (directActionAuths) {
        this.directActionAuthMap = this.makeDirectionActionAuthMap(directActionAuths);
    };
    RelationAuth.prototype.setFreeActionAuths = function (freeActionAuths) {
        var e_2, _a;
        var freeActionAuthMap = {};
        try {
            for (var freeActionAuths_1 = tslib_1.__values(freeActionAuths), freeActionAuths_1_1 = freeActionAuths_1.next(); !freeActionAuths_1_1.done; freeActionAuths_1_1 = freeActionAuths_1.next()) {
                var auth = freeActionAuths_1_1.value;
                var deActions = auth.deActions, destEntity = auth.destEntity;
                freeActionAuthMap[destEntity] = deActions;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (freeActionAuths_1_1 && !freeActionAuths_1_1.done && (_a = freeActionAuths_1.return)) _a.call(freeActionAuths_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.freeActionAuthMap = freeActionAuthMap;
    };
    RelationAuth.prototype.upsertFreeActionAuth = function (entity, actions) {
        this.freeActionAuthMap[entity] = actions;
    };
    RelationAuth.prototype.upsertDirectActionAuth = function (directActionAuth) {
        var deActions = directActionAuth.deActions, destEntity = directActionAuth.destEntity, sourceEntity = directActionAuth.sourceEntity, path = directActionAuth.path;
        var k = "$".concat(destEntity, "-").concat(path, "-").concat(sourceEntity);
        this.directActionAuthMap[k] = deActions;
    };
    RelationAuth.prototype.removeDirectActionAuth = function (directActionAuth) {
        var deActions = directActionAuth.deActions, destEntity = directActionAuth.destEntity, sourceEntity = directActionAuth.sourceEntity, path = directActionAuth.path;
        var k = "$".concat(destEntity, "-").concat(path, "-").concat(sourceEntity);
        delete this.directActionAuthMap[k];
    };
    // 前台检查filter是否满足relation约束
    RelationAuth.prototype.checkRelationSync = function (entity, operation, context) {
        var _this = this;
        if (context.isRoot()) {
            return;
        }
        var action = operation.action || 'select';
        // 前台在cache中查看有无freeActionAuth
        var _a = tslib_1.__read(context.select('freeActionAuth', {
            data: {
                id: 1,
            },
            filter: {
                destEntity: entity,
                deActions: {
                    $contains: action,
                },
            }
        }, {}), 1), freeActionAuth = _a[0];
        if (freeActionAuth) {
            return;
        }
        // 前台在cache中取这个对象可能存在的directActionAuth，并构造ddaMap
        var directActionAuths = context.select('directActionAuth', {
            data: {
                id: 1,
                deActions: 1,
                destEntity: 1,
                path: 1,
            },
            filter: {
                destEntity: entity,
            }
        }, {});
        var ddaMap = this.makeDirectionActionAuthMap(directActionAuths);
        var userId = context.getCurrentUserId();
        if (!userId) {
            throw new types_1.OakNoRelationDefException(entity, action);
        }
        if (action === 'create' && this.relationalCreateChecker[entity]) {
            var _b = operation, data = _b.data, filter = _b.filter;
            if (filter) {
                // 如果create传了filter, 前台保证create一定满足此约束，优先判断
                var callback = this.relationalCreateChecker[entity](userId, ddaMap, undefined, filter);
                callback(context);
            }
            else if (data instanceof Array) {
                data.forEach(function (ele) {
                    var callback = _this.relationalCreateChecker[entity](userId, ddaMap, ele);
                    callback(context);
                });
            }
            else {
                (0, assert_1.default)(data);
                var callback = this.relationalCreateChecker[entity](userId, ddaMap, data);
                callback(context);
            }
        }
        else if (action !== 'create' && this.relationalFilterMaker[entity]) {
            var filter = this.relationalFilterMaker[entity](action, userId, ddaMap);
            var operationFilter = operation.filter;
            (0, assert_1.default)(filter, "\u5728\u68C0\u67E5".concat(entity, "\u4E0A\u6267\u884C").concat(action, "\u64CD\u4F5C\u65F6\u6CA1\u6709\u4F20\u5165filter"));
            if ((0, filter_1.checkFilterContains)(entity, context, filter, operationFilter, true)) {
                return;
            }
            throw new types_1.OakUserUnpermittedException("\u5F53\u524D\u7528\u6237\u4E0D\u5141\u8BB8\u5728".concat(entity, "\u4E0A\u6267\u884C").concat(action, "\u64CD\u4F5C"));
        }
        throw new types_1.OakUnloggedInException();
    };
    RelationAuth.prototype.checkActionAsync = function (entity, operation, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, userId, _a, data, filter, callback, filter, operationFilter;
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        action = operation.action || 'select';
                        userId = context.getCurrentUserId();
                        if (!(action === 'create' && this.relationalCreateChecker[entity])) return [3 /*break*/, 5];
                        _a = operation, data = _a.data, filter = _a.filter;
                        if (!(data instanceof Array)) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.all(data.map(function (ele) {
                                var callback = _this.relationalCreateChecker[entity](userId, _this.directActionAuthMap, ele);
                                return callback(context);
                            }))];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        (0, assert_1.default)(data);
                        callback = this.relationalCreateChecker[entity](userId, this.directActionAuthMap, data);
                        return [4 /*yield*/, callback(context)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        if (!(action !== 'create' && this.relationalFilterMaker[entity])) return [3 /*break*/, 7];
                        filter = this.relationalFilterMaker[entity](action, userId, this.directActionAuthMap);
                        operationFilter = operation.filter;
                        (0, assert_1.default)(filter, "\u5728\u68C0\u67E5".concat(entity, "\u4E0A\u6267\u884C").concat(action, "\u64CD\u4F5C\u65F6\u6CA1\u6709\u4F20\u5165filter"));
                        return [4 /*yield*/, (0, filter_1.checkFilterContains)(entity, context, filter, operationFilter, true)];
                    case 6:
                        if (_b.sent()) {
                            return [2 /*return*/];
                        }
                        throw new types_1.OakUserUnpermittedException("\u5F53\u524D\u7528\u6237\u4E0D\u5141\u8BB8\u5728".concat(entity, "\u4E0A\u6267\u884C").concat(action, "\u64CD\u4F5C"));
                    case 7: throw new types_1.OakUnloggedInException();
                }
            });
        });
    };
    /**
     * 在entity上执行Operation，等同于在其path路径的父对象上执行相关的action操作，进行relation判定
     * @param entity
     * @param operation
     * @param context
     */
    RelationAuth.prototype.checkCascadeActionAsync = function (entity, operation, path, action, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var childData, childFilter, childAction, paths;
            return tslib_1.__generator(this, function (_a) {
                childData = operation.data, childFilter = operation.filter;
                childAction = operation.action || 'select';
                (0, assert_1.default)(path);
                paths = path.split('.');
                return [2 /*return*/];
            });
        });
    };
    // 后台检查filter是否满足relation约束
    RelationAuth.prototype.checkRelationAsync = function (entity, operation, context) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, userId;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (context.isRoot()) {
                            return [2 /*return*/];
                        }
                        action = operation.action || 'select';
                        // 后台用缓存的faa来判定，减少对数据库的查询（freeActionAuth表很少更新）
                        if (!this.freeActionAuthMap || ((_a = this.freeActionAuthMap[entity]) === null || _a === void 0 ? void 0 : _a.includes(action))) {
                            return [2 /*return*/];
                        }
                        userId = context.getCurrentUserId();
                        if (!userId) {
                            throw new types_1.OakNoRelationDefException(entity, action);
                        }
                        // 对compile中放过的几个特殊meta对象的处理
                        /*  switch (entity as string) {
                             case 'modi': {
                                 if (action === 'select') {
                                     return this.checkActionAsync()
                                 }
                             }
                         } */
                        return [4 /*yield*/, this.checkActionAsync(entity, operation, context)];
                    case 1:
                        // 对compile中放过的几个特殊meta对象的处理
                        /*  switch (entity as string) {
                             case 'modi': {
                                 if (action === 'select') {
                                     return this.checkActionAsync()
                                 }
                             }
                         } */
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 后台需要注册数据变化的监听器，以保证缓存的维度数据准确
     * 在集群上要支持跨结点的监听器(todo)
     */
    RelationAuth.prototype.getAuthDataTriggers = function () {
        var _this = this;
        return [
            {
                entity: 'freeActionAuth',
                name: 'freeActionAuth新增时，更新relationAuth中的缓存数据',
                action: 'create',
                when: 'commit',
                fn: function (_a) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data;
                        var _this = this;
                        return tslib_1.__generator(this, function (_b) {
                            data = operation.data;
                            if (data instanceof Array) {
                                data.forEach(function (ele) { return _this.upsertFreeActionAuth(ele.destEntity, ele.deActions); });
                                return [2 /*return*/, data.length];
                            }
                            else {
                                this.upsertFreeActionAuth(data.destEntity, data.deActions);
                                return [2 /*return*/, 1];
                            }
                            return [2 /*return*/];
                        });
                    });
                }
            },
            {
                entity: 'freeActionAuth',
                action: 'update',
                when: 'commit',
                name: 'freeActionAuth更新时，刷新relationAuth中的缓存数据',
                fn: function (_a, context) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data, filter, faas, _b, deActions, destEntity;
                        return tslib_1.__generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    data = operation.data, filter = operation.filter;
                                    (0, assert_1.default)(typeof filter.id === 'string'); //  freeAuthDict不应当有其它更新的情况
                                    (0, assert_1.default)(!data.destEntity);
                                    if (!data.deActions) return [3 /*break*/, 2];
                                    return [4 /*yield*/, context.select('freeActionAuth', {
                                            data: {
                                                id: 1,
                                                deActions: 1,
                                                destEntity: 1,
                                            },
                                            filter: filter,
                                        }, { dontCollect: true })];
                                case 1:
                                    faas = _c.sent();
                                    (0, assert_1.default)(faas.length === 1);
                                    _b = faas[0], deActions = _b.deActions, destEntity = _b.destEntity;
                                    this.upsertFreeActionAuth(destEntity, deActions);
                                    return [2 /*return*/, 1];
                                case 2: return [2 /*return*/, 0];
                            }
                        });
                    });
                }
            },
            {
                entity: 'freeActionAuth',
                action: 'remove',
                when: 'commit',
                name: 'freeActionAuth删除时，刷新relationAuth中的缓存数据',
                fn: function (_a, context) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data, filter, faas, destEntity;
                        return tslib_1.__generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    data = operation.data, filter = operation.filter;
                                    (0, assert_1.default)(typeof filter.id === 'string'); //  freeActionAuth不应当有其它更新的情况
                                    return [4 /*yield*/, context.select('freeActionAuth', {
                                            data: {
                                                id: 1,
                                                deActions: 1,
                                                destEntity: 1,
                                            },
                                            filter: filter,
                                        }, { dontCollect: true, includedDeleted: true })];
                                case 1:
                                    faas = _b.sent();
                                    (0, assert_1.default)(faas.length === 1);
                                    destEntity = faas[0].destEntity;
                                    if (this.freeActionAuthMap) {
                                        delete this.freeActionAuthMap[destEntity];
                                    }
                                    return [2 /*return*/, 1];
                            }
                        });
                    });
                }
            },
            {
                entity: 'directActionAuth',
                name: 'directActionAuth新增时，更新relationAuth中的缓存数据',
                action: 'create',
                when: 'commit',
                fn: function (_a) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data;
                        var _this = this;
                        return tslib_1.__generator(this, function (_b) {
                            data = operation.data;
                            if (data instanceof Array) {
                                data.forEach(function (ele) { return _this.upsertDirectActionAuth(ele); });
                                return [2 /*return*/, data.length];
                            }
                            else {
                                this.upsertDirectActionAuth(data);
                                return [2 /*return*/, 1];
                            }
                            return [2 /*return*/];
                        });
                    });
                }
            },
            {
                entity: 'directActionAuth',
                action: 'update',
                when: 'commit',
                name: 'directActionAuth更新时，刷新relationAuth中的缓存数据',
                fn: function (_a, context) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data, filter, daas;
                        return tslib_1.__generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    data = operation.data, filter = operation.filter;
                                    (0, assert_1.default)(typeof filter.id === 'string'); //  freeAuthDict不应当有其它更新的情况
                                    (0, assert_1.default)(!data.destEntity && !data.sourceEntity && !data.path);
                                    if (!data.deActions) return [3 /*break*/, 2];
                                    return [4 /*yield*/, context.select('directActionAuth', {
                                            data: {
                                                id: 1,
                                                deActions: 1,
                                                destEntity: 1,
                                                path: 1,
                                                sourceEntity: 1,
                                            },
                                            filter: filter,
                                        }, { dontCollect: true })];
                                case 1:
                                    daas = _b.sent();
                                    (0, assert_1.default)(daas.length === 1);
                                    this.upsertDirectActionAuth(daas[0]);
                                    return [2 /*return*/, 1];
                                case 2: return [2 /*return*/, 0];
                            }
                        });
                    });
                }
            },
            {
                entity: 'directActionAuth',
                action: 'remove',
                when: 'commit',
                name: 'directActionAuth删除时，刷新relationAuth中的缓存数据',
                fn: function (_a, context) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data, filter, daas;
                        return tslib_1.__generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    data = operation.data, filter = operation.filter;
                                    (0, assert_1.default)(typeof filter.id === 'string'); //  directActionAuth不应当有其它更新的情况
                                    return [4 /*yield*/, context.select('directActionAuth', {
                                            data: {
                                                id: 1,
                                                deActions: 1,
                                                destEntity: 1,
                                                path: 1,
                                                sourceEntity: 1,
                                            },
                                            filter: filter,
                                        }, { dontCollect: true, includedDeleted: true })];
                                case 1:
                                    daas = _b.sent();
                                    (0, assert_1.default)(daas.length === 1);
                                    this.removeDirectActionAuth(daas[0]);
                                    return [2 /*return*/, 1];
                            }
                        });
                    });
                }
            },
        ];
    };
    return RelationAuth;
}());
exports.RelationAuth = RelationAuth;
