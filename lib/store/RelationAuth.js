"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRelationsByActions = exports.RelationAuth = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var AsyncRowStore_1 = require("./AsyncRowStore");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var SyncRowStore_1 = require("./SyncRowStore");
var action_1 = require("../actions/action");
var lodash_1 = require("../utils/lodash");
var env_1 = require("../compiler/env");
var RelationAuth = /** @class */ (function () {
    function RelationAuth(schema, actionCascadePathGraph, relationCascadePathGraph, authDeduceRelationMap, selectFreeEntities, createFreeEntities, updateFreeEntities) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities || [];
        this.createFreeEntities = createFreeEntities || [];
        this.updateFreeEntities = updateFreeEntities || [];
        this.authDeduceRelationMap = Object.assign({}, authDeduceRelationMap, {
            modi: 'entity',
        });
    }
    // 前台检查filter是否满足relation约束
    RelationAuth.prototype.checkRelationSync = function (entity, operation, context) {
        if (context.isRoot()) {
            return;
        }
        this.checkActions2(entity, operation, context);
    };
    /**
     * 查询当前用户在对应entity上可以操作的relationIds
     * @param entity
     * @param entityId
     * @param context
     * @returns
     */
    RelationAuth.prototype.getGrantedRelationIds = function (entity, entityId, context) {
        var result = context.select('relationAuth', {
            data: {
                id: 1,
                destRelationId: 1,
                destRelation: {
                    id: 1,
                    name: 1,
                    entity: 1,
                    entityId: 1,
                    display: 1,
                },
            },
            filter: {
                sourceRelation: {
                    userRelation$relation: {
                        userId: context.getCurrentUserId(),
                    }
                },
                destRelation: {
                    entity: entity,
                    $or: [
                        {
                            entityId: entityId,
                        },
                        {
                            entityId: {
                                $exists: false,
                            },
                        }
                    ],
                },
            },
        }, {});
        if (result instanceof Promise) {
            return result.then(function (r2) { return r2.map(function (ele) { return ele.destRelation; }); });
        }
        return result.map(function (ele) { return ele.destRelation; });
    };
    // 后台检查filter是否满足relation约束
    RelationAuth.prototype.checkRelationAsync = function (entity, operation, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (context.isRoot()) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.checkActions2(entity, operation, context)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RelationAuth.prototype.checkOperateSpecialEntities2 = function (entity2, action, filter, context) {
        switch (entity2) {
            case 'userRelation': {
                (0, assert_1.default)(!(filter instanceof Array));
                (0, assert_1.default)(['create', 'remove'].includes(action));
                if (action === 'create') {
                    (0, assert_1.default)(!(filter instanceof Array));
                    var _a = filter, entity = _a.entity, entityId = _a.entityId, relationId_1 = _a.relationId;
                    // 创建userRelation如果是领取动作，先暂使用root身份通过
                    var destRelations = this.getGrantedRelationIds(entity, entityId, context);
                    if (destRelations instanceof Promise) {
                        return destRelations.then(function (r2) {
                            if (relationId_1 && !r2.find(function (ele) { return ele.id === relationId_1; }) || r2.length === 0) {
                                return false;
                            }
                            return true;
                        });
                    }
                    // 若指定了要create的relation，则必须有该relationId存在，否则只要有任意可授权的relation即可
                    if (relationId_1 && !destRelations.find(function (ele) { return ele.id === relationId_1; }) || destRelations.length === 0) {
                        return false;
                    }
                    return true;
                }
                else {
                    (0, assert_1.default)(action === 'remove');
                    var userId = context.getCurrentUserId();
                    (0, assert_1.default)(filter);
                    var contained = {
                        relation: {
                            relationAuth$destRelation: {
                                sourceRelation: {
                                    userRelation$relation: {
                                        userId: userId,
                                    },
                                },
                            },
                        },
                    };
                    return (0, filter_1.checkFilterContains)(entity2, context, contained, filter, true);
                }
            }
            case 'user': {
                // 对用户的操作由应用自己去管理权限，这里只检查grant/revoke
                if (['grant', 'revoke'].includes(action)) {
                    // assert(filter && Object.keys(filter).length === 1, 'grant/revoke只能操作userRelation$user');
                    // assert(filter!.hasOwnProperty('userRelation$user'), 'grant/revoke只能操作userRelation$user');
                    return true;
                }
                else {
                    // 应用允许用户操作其它用户的逻辑请通过编写类型为relation的checker去控制，在这里不能加以限制
                    return true;
                }
            }
            case 'modi': {
                // modi的操作权限都是由触发器触发，不用再检测了
                return true;
            }
            case 'relation': {
                // 创建relation目前不支持，以后再说
                return false;
            }
            case 'userEntityGrant': {
                // userEntityGrant的创建相当于授权，领取相当于赋权
                if (['create', 'update', 'remove'].includes(action)) {
                    if (action === 'create') {
                        return this.checkOperateSpecialEntities2('userRelation', 'create', filter, context);
                    }
                    return this.checkOperateSpecialEntities2('userRelation', 'action', {
                        relation: {
                            userEntityGrant$relation: filter,
                        },
                    }, context);
                }
                // 领取和读取动作公开
                return true;
            }
            default: {
                (0, assert_1.default)(false, "\u5BF9\u8C61".concat(entity2, "\u7684\u6743\u9650\u63A7\u5236\u6CA1\u6709\u52A0\u4EE5\u63A7\u5236"));
            }
        }
    };
    RelationAuth.prototype.getDeducedEntityFilters = function (entity, filter, actions, context) {
        var e_1, _a;
        var _this = this;
        var entityFilters = [
            {
                entity: entity,
                filter: filter,
                actions: actions,
            }
        ];
        if (this.authDeduceRelationMap[entity]) {
            (0, assert_1.default)(this.authDeduceRelationMap[entity] === 'entity');
            var _b = filter, deduceEntity = _b.entity, deduceEntityId_1 = _b.entityId;
            var deduceFilter = {};
            if (deduceEntity && deduceEntityId_1) {
                deduceFilter = { id: deduceEntityId_1 };
            }
            else {
                // 也可能是用cascade方式进行查找，这里有时候filter上会带有两个不同的entity目标，尚未处理（todo!）
                var ref = this.schema[entity].attributes.entity.ref;
                (0, assert_1.default)(ref instanceof Array);
                try {
                    for (var ref_1 = tslib_1.__values(ref), ref_1_1 = ref_1.next(); !ref_1_1.done; ref_1_1 = ref_1.next()) {
                        var refEntity = ref_1_1.value;
                        if (filter[refEntity]) {
                            deduceEntity = refEntity;
                            deduceFilter = filter[refEntity];
                            break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (ref_1_1 && !ref_1_1.done && (_a = ref_1.return)) _a.call(ref_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            var getRecursiveDeducedFilters_1 = function (deduceEntity, deduceFilter) {
                var excludeActions = action_1.readOnlyActions.concat([ /* 'create', 'remove' */]);
                var updateActions = _this.schema[deduceEntity].actions.filter(function (a) { return !excludeActions.includes(a); });
                if (!RelationAuth.SPECIAL_ENTITIES.includes(deduceEntity)) {
                    return _this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions, context);
                }
                return [];
            };
            if (deduceEntity && deduceFilter) {
                var deducedSelections = getRecursiveDeducedFilters_1(deduceEntity, deduceFilter);
                if (deducedSelections instanceof Promise) {
                    return deducedSelections.then(function (ds) {
                        entityFilters.push.apply(entityFilters, tslib_1.__spreadArray([], tslib_1.__read(ds), false));
                        return entityFilters;
                    });
                }
                entityFilters.push.apply(entityFilters, tslib_1.__spreadArray([], tslib_1.__read(deducedSelections), false));
                return entityFilters;
            }
            else {
                /**
                 * 这种情况说明从filter中无法确定相应的deduceFilter，需要查找该实体对应的entity/entityId来进行推导。
                 * 这种情况一般发生在entity1 -> entity2上，此时entity2应该是一个固定id查询的filter
                 * 在这里先假设如果碰到了list类型的filter，直接不使用deduce路径上的对象来推导
                 */
                var rows2 = context.select(entity, {
                    data: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    filter: filter,
                    indexFrom: 0,
                    count: 10,
                }, { dontCollect: true, blockTrigger: true });
                var dealWithData_1 = function (rows) {
                    // 这里如果entity指向不同的实体，一般出现这样的查询，则其权限应当不由这条deduce路径处理
                    // 同上，如果找到的行数大于1行，说明deduce路径上的对象不确定，也暂不处理  by Xc 20230725
                    if (rows.length > 1 || rows.length === 0) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn("\u8FDB\u884Cdeduce\u63A8\u5BFC\u65F6\u627E\u5230\u4E86".concat(rows.length, "\u884C").concat(entity, "\u6570\u636E"));
                        }
                        return entityFilters;
                    }
                    var _a = rows[0], deducedEntity = _a.entity, deducedEntityId = _a.entityId;
                    if (!deducedEntity || !deducedEntityId) {
                        // 这种情况会出现在前台缓存里
                        return entityFilters;
                    }
                    var result = getRecursiveDeducedFilters_1(deducedEntity, {
                        id: deduceEntityId_1,
                    });
                    if (result instanceof Promise) {
                        return result.then(function (r2) {
                            entityFilters.push.apply(entityFilters, tslib_1.__spreadArray([], tslib_1.__read(r2), false));
                            return entityFilters;
                        });
                    }
                    entityFilters.push.apply(entityFilters, tslib_1.__spreadArray([], tslib_1.__read(result), false));
                    return entityFilters;
                };
                if (rows2 instanceof Promise) {
                    return rows2.then(function (r2) { return dealWithData_1(r2); });
                }
                return dealWithData_1(rows2);
            }
        }
        return entityFilters;
    };
    /**
     * 对于selection，解构出最底层的对象，如果最底层的对象可以被访问，则父对象一定可以
     * 但对于deduce的子对象，不必再向底层查看（假设deduce对象一般都位于树的最底层附近）
     * @param entity
     * @param operation
     */
    RelationAuth.prototype.destructSelection = function (entity, selection) {
        var _this = this;
        var leafSelections = [];
        var destructInner = function (entity2, selection2) {
            var _a, _b;
            var data = selection2.data, filter = selection2.filter;
            var hasOneToMany = false;
            for (var attr in data) {
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity2, attr);
                if (rel instanceof Array) {
                    var _c = tslib_1.__read(rel, 2), e = _c[0], foreignKey = _c[1];
                    if (foreignKey) {
                        (0, assert_1.default)(!_this.authDeduceRelationMap[e]);
                        hasOneToMany = true;
                        destructInner(e, {
                            data: data[attr].data,
                            filter: (0, filter_1.combineFilters)(e, _this.schema, [(_a = {},
                                    _a[foreignKey.slice(0, foreignKey.length - 2)] = filter,
                                    _a), data[attr].filter || {}]),
                        });
                    }
                    else {
                        if (!_this.authDeduceRelationMap[e]) {
                            hasOneToMany = true;
                            destructInner(e, {
                                data: data[attr].data,
                                filter: (0, filter_1.combineFilters)(e, _this.schema, [(_b = {},
                                        _b[entity2] = filter,
                                        _b), data[attr].filter || {}]),
                            });
                        }
                        else {
                            (0, assert_1.default)(_this.authDeduceRelationMap[e] === 'entity');
                        }
                    }
                }
            }
            if (!hasOneToMany) {
                leafSelections.push({
                    entity: entity2,
                    filter: filter,
                });
            }
        };
        destructInner(entity, (0, lodash_1.cloneDeep)(selection));
        return leafSelections;
    };
    /**
     * 对于operation，解构出一个树形结构，以方便自顶向下的进行访问
     * 但对于deduce的子对象，不必再向底层查看
     * @param entity
     * @param selection
     */
    RelationAuth.prototype.destructOperation = function (entity2, operation2, userId) {
        var _this = this;
        /**
         * 对create动作，把data中的cascade部分剔除后作为filter参与后续的检验
         * @param operation
         * @returns
         */
        var makeCreateFilter = function (entity, operation) {
            var _a;
            var data = operation.data, filter = operation.filter;
            (0, assert_1.default)(!(data instanceof Array));
            if (data) {
                var data2 = {};
                for (var attr in data) {
                    var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                    if (rel === 1) {
                        // 只需要记住id和各种外键属性，不这样处理有些古怪的属性比如coordinate，其作为createdata和作为filter并不同构
                        if ((['id', 'entity', 'entityId'].includes(attr) || ((_a = _this.schema[entity].attributes[attr]) === null || _a === void 0 ? void 0 : _a.type) === 'ref') && typeof data[attr] === 'string') {
                            data2[attr] = data[attr];
                        }
                    }
                }
                return data2;
            }
            return filter;
        };
        var addChild = function (node, path, child) {
            var _a;
            // 在这里要把可以被node deduce出来的child处理掉
            var paths = path.split('$');
            (0, assert_1.default)(paths.length >= 2);
            if (_this.authDeduceRelationMap[child.entity] === paths[1]) {
                (0, assert_1.default)(paths[1] === 'entity', '当前只支持entity外键上的deduce');
                return false;
            }
            if (node.children[path]) {
                if (node.children[path] instanceof Array) {
                    node.children[path].push(child);
                }
                else {
                    node.children[path] = [node.children[path], child];
                }
            }
            else {
                Object.assign(node.children, (_a = {},
                    _a[path] = child,
                    _a));
            }
            return true;
        };
        var destructInner = function (entity, operation, 
        // extraFilter?: ED[T2]['Selection']['filter'],
        path, child, hasParent) {
            var action = operation.action, data = operation.data, filter = operation.filter;
            var filter2 = action === 'create' ? makeCreateFilter(entity, operation) : filter;
            (0, assert_1.default)(filter2);
            // const filter3 = extraFilter ? combineFilters(entity, schema, [filter2, extraFilter]) : filter2;
            var me = {
                entity: entity,
                filter: filter2,
                children: {},
                action: action,
            };
            var root = me;
            // 如果当前对象是一个toModi的，意味着它的cascadeUpdate会全部被变为modi去缓存，因此不需要再向下检查了
            // modi被apply时，这些modi产生的更新才会被实际检查
            var isModiUpdate = _this.schema[entity].toModi && action !== 'remove';
            if (child) {
                (0, assert_1.default)(path);
                addChild(me, path, child);
            }
            var _loop_1 = function (attr) {
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                if (rel === 2 && !isModiUpdate) {
                    (0, assert_1.default)(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(attr, data[attr], "".concat(entity, "$entity"), me);
                }
                else if (typeof rel === 'string' && !isModiUpdate) {
                    (0, assert_1.default)(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(rel, data[attr], "".concat(entity, "$").concat(attr), me);
                }
                else if (rel instanceof Array && !isModiUpdate) {
                    var _a = tslib_1.__read(rel, 2), e_2 = _a[0], f = _a[1];
                    var otmOperations = data[attr];
                    if (e_2 === 'userRelation' && entity !== 'user') {
                        me.userRelations = [];
                        var dealWithUserRelation_1 = function (userRelation) {
                            var _a;
                            var action = userRelation.action, data = userRelation.data;
                            (0, assert_1.default)(action === 'create', 'cascade更新中只允许创建userRelation');
                            var attrs = Object.keys(data);
                            (0, assert_1.default)((0, lodash_1.difference)(attrs, Object.keys(_this.schema.userRelation.attributes).concat('id')).length === 0);
                            if (data.userId === userId) {
                                (_a = me.userRelations) === null || _a === void 0 ? void 0 : _a.push(data);
                            }
                        };
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach(function (otmOperation) { return dealWithUserRelation_1(otmOperation); });
                        }
                        else {
                            dealWithUserRelation_1(otmOperations);
                        }
                    }
                    else {
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach(function (otmOperation) {
                                var son = destructInner(e_2, otmOperation, undefined, undefined, true);
                                addChild(me, attr, son);
                            });
                        }
                        else {
                            var son = destructInner(e_2, otmOperations, undefined, undefined, true);
                            addChild(me, attr, son);
                        }
                    }
                }
            };
            for (var attr in data) {
                _loop_1(attr);
            }
            return root;
        };
        return destructInner(entity2, (0, lodash_1.cloneDeep)(operation2));
    };
    /**
     * 定位到了当前用户所有可能的actionAuth，对单条actionAuth加以判断，找到可以满足当前操作的actionAuth
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @return  string代表用户获得授权的relationId，空字符串代表通过userId赋权，false代表失败
     */
    RelationAuth.prototype.filterActionAuths = function (entity, filter, actionAuths, context, actions) {
        return actionAuths.map(function (ele) {
            var paths = ele.paths, relation = ele.relation, relationId = ele.relationId;
            if (relationId) {
                (0, assert_1.default)(relation);
                var userRelations = relation.userRelation$relation;
                if (userRelations.length > 0) {
                    var entityIds = (0, lodash_1.uniq)(userRelations.map(function (ele) { return ele.entityId; }));
                    var idFilter_1 = entityIds.length > 1 ? {
                        $in: entityIds,
                    } : entityIds[0];
                    (0, assert_1.default)(idFilter_1);
                    var pathFilters_1 = paths.map(function (path) {
                        if (path) {
                            return (0, lodash_1.set)({}, path, {
                                id: idFilter_1,
                            });
                        }
                        return {
                            id: idFilter_1,
                        };
                    });
                    // 这里是或关系，只要对象落在任意一条路径上就可以
                    var contained_1 = (0, filter_1.combineFilters)(entity, context.getSchema(), pathFilters_1, true);
                    var contains_1 = (0, filter_1.checkFilterContains)(entity, context, contained_1, filter, true);
                    if (contains_1 instanceof Promise) {
                        return contains_1.then(function (c) {
                            if (c) {
                                return ele;
                            }
                            return;
                        });
                    }
                    if (contains_1) {
                        return ele;
                    }
                    return;
                }
                return;
            }
            // 说明是通过userId关联
            var pathFilters = paths.map(function (path) { return (0, lodash_1.set)({}, "".concat(path, ".id"), context.getCurrentUserId()); });
            var contained = (0, filter_1.combineFilters)(entity, context.getSchema(), pathFilters, true);
            var contains = (0, filter_1.checkFilterContains)(entity, context, contained, filter, true);
            if (contains instanceof Promise) {
                return contains.then(function (c) {
                    if (c) {
                        return ele;
                    }
                    return;
                });
            }
            if (contains) {
                return ele;
            }
        });
    };
    /**
     * 对于有些特殊的查询（带很多$or的查询，多发生在系统级别），单个actionAuth无法满足，需要共同加以判定
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @param actions
     */
    RelationAuth.prototype.checkActionAuthInGroup = function (entity, filter, actionAuths, context) {
        var filters = actionAuths.filter(function (ele) { return ele.destEntity === entity; }).map(function (ele) {
            var paths = ele.paths, relation = ele.relation, relationId = ele.relationId;
            if (relationId) {
                (0, assert_1.default)(relation);
                var userRelations = relation.userRelation$relation;
                (0, assert_1.default)(userRelations.length > 0);
                var entityIds = (0, lodash_1.uniq)(userRelations.map(function (ele) { return ele.entityId; }));
                var idFilter_2 = entityIds.length > 1 ? {
                    $in: entityIds,
                } : entityIds[0];
                (0, assert_1.default)(idFilter_2);
                var pathFilters = paths.map(function (path) {
                    if (path) {
                        return (0, lodash_1.set)({}, path, {
                            id: idFilter_2,
                        });
                    }
                    return {
                        id: idFilter_2
                    };
                });
                return pathFilters;
            }
            // 说明是通过userId关联
            return paths.map(function (path) { return (0, lodash_1.set)({}, "".concat(path, ".id"), context.getCurrentUserId()); });
        });
        var groupFilter = (0, filter_1.combineFilters)(entity, this.schema, filters.flat(), true);
        if (groupFilter) {
            return (0, filter_1.checkFilterContains)(entity, context, groupFilter, filter, true);
        }
        return false;
    };
    RelationAuth.prototype.checkSelection = function (entity, selection, context) {
        var _this = this;
        var leafSelections = this.destructSelection(entity, selection);
        var deducedLeafSelections = leafSelections.map(function (_a) {
            var entity = _a.entity, filter = _a.filter;
            return _this.getDeducedEntityFilters(entity, filter, ['select'], context);
        });
        var checkDeducedLeafSelections = function (dlSelections2) {
            var dlSelections = dlSelections2.filter(function (ele) {
                var entities = ele.map(function (ele2) { return ele2.entity; });
                // 同一个leaf的deducedSelections中只要有一个能通过就足够了
                if ((0, lodash_1.intersection)(_this.selectFreeEntities, entities).length > 0) {
                    return false;
                }
                if ((0, lodash_1.intersection)(RelationAuth.SPECIAL_ENTITIES, entities).length > 0) {
                    // todo 
                    return false;
                }
                return true;
            });
            if (dlSelections.length === 0) {
                return true;
            }
            if (!context.getCurrentUserId()) {
                throw new types_1.OakUnloggedInException();
            }
            var allEntities = [];
            dlSelections.forEach(function (ele) { return ele.forEach(function (_a) {
                var entity = _a.entity;
                allEntities.push(entity);
            }); });
            var actionAuths = context.select('actionAuth', {
                data: {
                    id: 1,
                    paths: 1,
                    destEntity: 1,
                    deActions: 1,
                    relation: {
                        id: 1,
                        userRelation$relation: {
                            $entity: 'userRelation',
                            data: {
                                id: 1,
                                entity: 1,
                                entityId: 1,
                            },
                            filter: {
                                userId: context.getCurrentUserId(),
                            },
                        },
                    },
                },
                filter: {
                    deActions: {
                        $contains: 'select',
                    },
                    destEntity: {
                        $in: allEntities,
                    },
                    $or: [
                        {
                            relation: {
                                userRelation$relation: {
                                    userId: context.getCurrentUserId(),
                                },
                            }
                        },
                        {
                            relationId: {
                                $exists: false,
                            },
                        }
                    ]
                }
            }, { dontCollect: true });
            /**
             * 返回的结果中，第一层为leafNode，必须全通过，第二层为单个leafNode上的deduce，通过一个就可以
             * @param result
             * @returns
             */
            var checkResult = function (result) {
                var e_3, _a;
                var idx = 0;
                try {
                    for (var result_1 = tslib_1.__values(result), result_1_1 = result_1.next(); !result_1_1.done; result_1_1 = result_1.next()) {
                        var r1 = result_1_1.value;
                        var r2 = r1.find(function (ele) { return ele === true; });
                        if (!r2) {
                            if (process.env.NODE_ENV === 'development') {
                                console.warn('对象的select权限被否决，请检查', dlSelections[idx]);
                            }
                            return false;
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (result_1_1 && !result_1_1.done && (_a = result_1.return)) _a.call(result_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                return true;
            };
            if (actionAuths instanceof Promise) {
                (0, assert_1.default)(context instanceof AsyncRowStore_1.AsyncContext);
                return actionAuths.then(function (aas) { return Promise.all(dlSelections.map(function (ele) { return Promise.all(ele.map(function (ele2) { return _this.checkActionAuthInGroup(ele2.entity, ele2.filter, aas, context); })); })).then(function (result) { return checkResult(result); }); });
            }
            return checkResult(dlSelections.map(function (ele) { return ele.map(function (ele2) { return _this.checkActionAuthInGroup(ele2.entity, ele2.filter, actionAuths, context); }); }));
        };
        if (deducedLeafSelections[0] instanceof Promise) {
            return Promise.all(deducedLeafSelections)
                .then(function (dls) { return checkDeducedLeafSelections(dls); });
        }
        return checkDeducedLeafSelections(deducedLeafSelections);
    };
    RelationAuth.prototype.findActionAuthsOnNode = function (node, context) {
        var _this = this;
        var entity = node.entity, filter = node.filter, action = node.action, userRelations = node.userRelations;
        if (RelationAuth.SPECIAL_ENTITIES.includes(entity)) {
            // 特殊对象不用查询
            return [];
        }
        var deducedEntityFilters2 = this.getDeducedEntityFilters(entity, filter, [action], context);
        var dealWithDeducedEntityFilters = function (deducedEntityFilters) {
            var allEntities = deducedEntityFilters.map(function (ele) { return ele.entity; });
            var allActions = (0, lodash_1.uniq)(deducedEntityFilters.map(function (ele) { return ele.actions; }).flat());
            var actionAuths = context.select('actionAuth', {
                data: {
                    id: 1,
                    paths: 1,
                    destEntity: 1,
                    deActions: 1,
                    relation: {
                        id: 1,
                        userRelation$relation: {
                            $entity: 'userRelation',
                            data: {
                                id: 1,
                                entity: 1,
                                entityId: 1,
                            },
                            filter: {
                                userId: context.getCurrentUserId(),
                            },
                        },
                    },
                },
                filter: {
                    destEntity: {
                        $in: allEntities,
                    },
                    deActions: {
                        $overlaps: allActions,
                    },
                }
            }, { dontCollect: true });
            var getActionAuths = function (result) {
                var aas = [];
                result.forEach(function (ele) { return ele.forEach(function (ele2) {
                    if (!!ele2) {
                        aas.push(ele2);
                    }
                }); });
                return aas;
            };
            /**
             * 搜索判定是否允许自建对象，自建的条件是 path = ''，destEntity === entity
             * @param actionAuths
             * @returns
             */
            var findOwnCreateUserRelation = function (actionAuths) {
                if (userRelations) {
                    (0, assert_1.default)(action === 'create');
                    var ars = actionAuths.filter(function (ar) { return !!userRelations.find(function (ur) { return ur.relationId === ar.relationId; }) && ar.paths.includes('') && ar.destEntity === entity; });
                    if (ars.length > 0) {
                        return ars;
                    }
                }
            };
            if (actionAuths instanceof Promise) {
                return actionAuths.then(function (ars) {
                    var created = findOwnCreateUserRelation(ars);
                    if (created) {
                        return created;
                    }
                    return Promise.all(deducedEntityFilters.map(function (ele) {
                        var ars2 = ars.filter(function (ele2) { return ele2.destEntity === ele.entity && (0, lodash_1.intersection)(ele2.deActions, ele.actions).length > 0; } // 这里只要overlap就可以了
                        );
                        return Promise.all(_this.filterActionAuths(ele.entity, ele.filter, ars2, context, ele.actions));
                    })).then(function (result) { return getActionAuths(result); });
                });
            }
            (0, assert_1.default)(context instanceof SyncRowStore_1.SyncContext);
            var created = findOwnCreateUserRelation(actionAuths);
            if (created) {
                return created;
            }
            return getActionAuths(deducedEntityFilters.map(function (ele) {
                var ars2 = actionAuths.filter(function (ele2) { return ele2.destEntity === ele.entity && (0, lodash_1.intersection)(ele2.deActions, ele.actions).length > 0; } // 这里只要overlap就可以了
                );
                return _this.filterActionAuths(ele.entity, ele.filter, ars2, context, ele.actions);
            }));
        };
        if (deducedEntityFilters2 instanceof Promise) {
            return deducedEntityFilters2.then(function (def2) { return dealWithDeducedEntityFilters(def2); });
        }
        return dealWithDeducedEntityFilters(deducedEntityFilters2);
    };
    RelationAuth.prototype.checkOperationTree = function (tree, context) {
        var _this = this;
        var actionAuths2 = this.findActionAuthsOnNode(tree, context);
        var checkChildNode = function (actionAuths, node) {
            var checkChildNodeInner = function (legalAuths) {
                // 因为如果children是数组的话，会把数组中所有的action并起来查询，所以在这里还要再确认一次
                var realLegalPaths = legalAuths.filter(function (ele) {
                    if (ele.destEntity === node.entity && ele.deActions.includes(node.action)) {
                        return true;
                    }
                    // 有一种例外情况，是在tree的根结点findActionAuthsOnNode时，deduce出了另外一个对象的权限，此时肯定可以通过，但不能再使用这条路径对children进行进一步判断了
                    if (node === tree) {
                        return true;
                    }
                    return false;
                });
                var checkChildren = function () {
                    var children = node.children;
                    var childPath = Object.keys(children);
                    if (childPath.length === 0) {
                        return true;
                    }
                    var selfLegalPaths = realLegalPaths.filter(function (ele) {
                        if (ele.destEntity === node.entity && ele.deActions.includes(node.action)) {
                            return true;
                        }
                        return false;
                    });
                    // assert(selfLegalPaths.length > 0, `对象${node.entity as string}的权限检查是用deduce的对象通过的，无法再进一步对子对象加以判断`);
                    var childResult = childPath.map(function (childPath) {
                        var child = children[childPath];
                        var childEntity = child instanceof Array ? child[0].entity : child.entity;
                        // 这里如果该子结点能deduce到父，则直接通过
                        if (_this.authDeduceRelationMap[childEntity]) {
                            (0, assert_1.default)(_this.authDeduceRelationMap[childEntity] === 'entity');
                            var rel = (0, relation_1.judgeRelation)(_this.schema, childEntity, childPath);
                            if (rel === 2) {
                                return true;
                            }
                        }
                        var pathToParent = childPath.endsWith('$entity') ? node.entity : childPath.split('$')[1];
                        if (child instanceof Array) {
                            var childActions_1 = child.map(function (ele) { return ele.action; });
                            var childLegalAuths_1 = selfLegalPaths.map(function (ele) {
                                var paths = ele.paths, relationId = ele.relationId;
                                var paths2 = paths.map(function (path) { return path ? "".concat(pathToParent, ".").concat(path) : pathToParent; });
                                return context.select('actionAuth', {
                                    data: {
                                        id: 1,
                                    },
                                    filter: {
                                        paths: {
                                            $overlaps: paths2,
                                        },
                                        destEntity: childEntity,
                                        deActions: {
                                            $overlaps: childActions_1,
                                        },
                                        relationId: relationId || {
                                            $exists: false,
                                        },
                                    }
                                }, { dontCollect: true });
                            }).flat();
                            if (childLegalAuths_1[0] instanceof Promise) {
                                return Promise.all(childLegalAuths_1).then(function (clas) { return child.map(function (c) { return checkChildNode(clas, c); }); });
                            }
                            return child.map(function (c) { return checkChildNode(childLegalAuths_1, c); });
                        }
                        var childLegalAuths = realLegalPaths.map(function (ele) {
                            var paths = ele.paths, relationId = ele.relationId;
                            var paths2 = paths.map(function (path) { return path ? "".concat(pathToParent, ".").concat(path) : pathToParent; });
                            return context.select('actionAuth', {
                                data: {
                                    id: 1,
                                },
                                filter: {
                                    paths: {
                                        $overlaps: paths2,
                                    },
                                    destEntity: childEntity,
                                    deActions: {
                                        $overlaps: child.action,
                                    },
                                    relationId: relationId || {
                                        $exists: false,
                                    },
                                }
                            }, { dontCollect: true });
                        }).flat();
                        if (childLegalAuths[0] instanceof Promise) {
                            return Promise.all(childLegalAuths).then(function (clas) { return checkChildNode(clas.flat(), child); });
                        }
                        return checkChildNode(childLegalAuths, child);
                    }).flat();
                    if (childResult[0] instanceof Promise) {
                        return Promise.all(childResult).then(function (r) { return !r.includes(false); });
                    }
                    return !childResult.includes(false);
                };
                if (RelationAuth.SPECIAL_ENTITIES.includes(node.entity)) {
                    // 特殊entity走特别的路径判断
                    var result = _this.checkOperateSpecialEntities2(node.entity, node.action, node.filter, context);
                    if (result instanceof Promise) {
                        return result.then(function (r) {
                            if (r) {
                                return checkChildren();
                            }
                            return false;
                        });
                    }
                    if (result) {
                        if (node.entity === 'user') {
                            // 如果当前是对user对象操作，需要加上一个指向它自身的actionAuth，否则剩下的子对象会判定不过
                            // user的操作权限由应用自己决定，如果user的操作最终过不去，这里放过也没关系
                            (0, assert_1.default)(node === tree && realLegalPaths.length === 0); // user不可能是非根结点
                            realLegalPaths.push({
                                id: 'temp',
                                paths: [''],
                                $$createAt$$: 1,
                                $$updateAt$$: 1,
                                $$seq$$: 'temp',
                                destEntity: 'user',
                                deActions: [node.action],
                            });
                        }
                        return checkChildren();
                    }
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('对象operate权限检查不通过', node);
                    }
                    return false;
                }
                if (realLegalPaths.length === 0) {
                    if (node === tree) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('对象operate权限检查不通过', node);
                        }
                        return false;
                    }
                    // 如果不是tree的根结点，相对路径上的actionAuth找不到，还可以尝试从自身的filter去重试其它路径
                    return _this.checkOperationTree(node, context);
                }
                return checkChildren();
            };
            if (actionAuths instanceof Promise) {
                return actionAuths.then(function (aars) { return checkChildNodeInner(aars); });
            }
            return checkChildNodeInner(actionAuths);
        };
        return checkChildNode(actionAuths2, tree);
    };
    RelationAuth.prototype.checkOperation = function (entity, operation, context) {
        var action = operation.action, filter = operation.filter, data = operation.data;
        if (action === 'create' && this.createFreeEntities.includes(entity)) {
            return true;
        }
        else if (action === 'update' && this.updateFreeEntities.includes(entity)) {
            return true;
        }
        var userId = context.getCurrentUserId();
        if (!userId) {
            throw new types_1.OakUnloggedInException();
        }
        if (!filter && (!data || action !== 'create')) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('operation不能没有限制条件', operation);
            }
            return false;
        }
        var updateTree = this.destructOperation(entity, operation, userId);
        return this.checkOperationTree(updateTree, context);
    };
    /**
     * 检查一个operation是否能被通过权限测试
     * 一个cascadeOperation是一棵树形结构：
     * * 对于select，只要叶子通过其父结点必然通过；
     * * 对于update，自顶向下进行检查，若父亲被权限S通过，则只需要检查子对于S有没有相对路径上的actionAuth
     *      另外在update中，还需要考虑自建userRelation的case（例如在电子商务网站上购买商品，创建订单同时创建用户和订单的关系）
     * @param entity
     * @param operation
     * @param context
     * @param actions
     * @returns
     */
    RelationAuth.prototype.checkActions2 = function (entity, operation, context, actions) {
        var action = operation.action;
        if (!action || action_1.readOnlyActions.includes(action)) {
            var result = this.checkSelection(entity, operation, context);
            if (result instanceof Promise) {
                return result.then(function (r) {
                    if (!r) {
                        throw new types_1.OakUserUnpermittedException();
                    }
                });
            }
            if (!result) {
                throw new types_1.OakUserUnpermittedException();
            }
        }
        else {
            var result = this.checkOperation(entity, operation, context);
            if (result instanceof Promise) {
                return result.then(function (r) {
                    if (!r) {
                        throw new types_1.OakUserUnpermittedException();
                    }
                });
            }
            if (!result) {
                throw new types_1.OakUserUnpermittedException();
            }
        }
    };
    RelationAuth.SPECIAL_ENTITIES = env_1.SYSTEM_RESERVE_ENTITIES;
    return RelationAuth;
}());
exports.RelationAuth = RelationAuth;
;
/**
 * 获取有对entity进行actions操作权限的userRelation关系
 * @param params
 * @param context
 * todo paths改成复数以后这里还未充分测试过
 */
function getUserRelationsByActions(params, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var entity, filter, actions, overlap, actionAuthfilter, actionAuths, getUserRelations, getDirectUserEntities, urAuths2, directAuths2, _a, userRelations, userEntities;
        var _this = this;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    entity = params.entity, filter = params.filter, actions = params.actions, overlap = params.overlap;
                    actionAuthfilter = {
                        destEntity: entity,
                    };
                    if (overlap) {
                        Object.assign(actionAuthfilter, {
                            deActions: {
                                $overlaps: actions,
                            },
                        });
                    }
                    else {
                        Object.assign(actionAuthfilter, {
                            deActions: {
                                $contains: actions,
                            },
                        });
                    }
                    return [4 /*yield*/, context.select('actionAuth', {
                            data: {
                                id: 1,
                                paths: 1,
                                relationId: 1,
                                relation: {
                                    id: 1,
                                    entity: 1,
                                },
                            },
                            filter: actionAuthfilter,
                        }, { dontCollect: true })];
                case 1:
                    actionAuths = _b.sent();
                    getUserRelations = function (urAuths) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var makeRelationIterator, urAuthDict2, userRelations;
                        var _this = this;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    makeRelationIterator = function (path, relationIds) {
                                        var paths = path.split('.');
                                        var makeIter = function (e, idx) {
                                            var _a, _b, _c;
                                            if (idx === paths.length) {
                                                return {
                                                    projection: {
                                                        id: 1,
                                                        userRelation$entity: {
                                                            $entity: 'userRelation',
                                                            data: {
                                                                id: 1,
                                                                relationId: 1,
                                                                relation: {
                                                                    id: 1,
                                                                    name: 1,
                                                                },
                                                                entity: 1,
                                                                entityId: 1,
                                                                userId: 1,
                                                            },
                                                            filter: {
                                                                relationId: {
                                                                    $in: relationIds,
                                                                },
                                                            },
                                                        }
                                                    },
                                                    getData: function (d) {
                                                        return d.userRelation$entity;
                                                    },
                                                };
                                            }
                                            var attr = paths[idx];
                                            var rel = (0, relation_1.judgeRelation)(context.getSchema(), e, attr);
                                            if (rel === 2) {
                                                var _d = makeIter(attr, idx + 1), projection = _d.projection, getData_1 = _d.getData;
                                                return {
                                                    projection: (_a = {
                                                            id: 1
                                                        },
                                                        _a[attr] = projection,
                                                        _a),
                                                    getData: function (d) { return d[attr] && getData_1(d[attr]); },
                                                };
                                            }
                                            else if (typeof rel === 'string') {
                                                var _e = makeIter(rel, idx + 1), projection = _e.projection, getData_2 = _e.getData;
                                                return {
                                                    projection: (_b = {
                                                            id: 1
                                                        },
                                                        _b[attr] = projection,
                                                        _b),
                                                    getData: function (d) { return d[attr] && getData_2(d[attr]); },
                                                };
                                            }
                                            else {
                                                (0, assert_1.default)(rel instanceof Array);
                                                var _f = tslib_1.__read(rel, 2), e2 = _f[0], fk = _f[1];
                                                var _g = makeIter(e2, idx + 1), projection = _g.projection, getData_3 = _g.getData;
                                                return {
                                                    projection: (_c = {
                                                            id: 1
                                                        },
                                                        _c[attr] = {
                                                            $entity: e2,
                                                            data: projection,
                                                        },
                                                        _c),
                                                    getData: function (d) { return d[attr] && d[attr].map(function (ele) { return getData_3(ele); }); },
                                                };
                                            }
                                        };
                                        return makeIter(entity, 0);
                                    };
                                    urAuthDict2 = {};
                                    urAuths.forEach(function (auth) {
                                        var paths = auth.paths, relationId = auth.relationId;
                                        paths.forEach(function (path) {
                                            if (!urAuthDict2[path]) {
                                                urAuthDict2[path] = [relationId];
                                            }
                                            else if (!urAuthDict2[path].includes(relationId)) {
                                                urAuthDict2[path].push(relationId);
                                            }
                                        });
                                    });
                                    return [4 /*yield*/, Promise.all(Object.keys(urAuthDict2).map(function (path) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                            var relationIds, _a, projection, getData, rows, urs;
                                            return tslib_1.__generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        relationIds = urAuthDict2[path];
                                                        _a = makeRelationIterator(path, relationIds), projection = _a.projection, getData = _a.getData;
                                                        return [4 /*yield*/, context.select(entity, {
                                                                data: projection,
                                                                filter: filter,
                                                            }, { dontCollect: true })];
                                                    case 1:
                                                        rows = _b.sent();
                                                        urs = rows.map(function (ele) { return getData(ele); }).flat().filter(function (ele) { return !!ele; });
                                                        return [2 /*return*/, urs];
                                                }
                                            });
                                        }); }))];
                                case 1:
                                    userRelations = _a.sent();
                                    return [2 /*return*/, userRelations.flat()];
                            }
                        });
                    }); };
                    getDirectUserEntities = function (directAuths) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var makeRelationIterator, userEntities;
                        var _this = this;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    makeRelationIterator = function (path) {
                                        var paths = path.split('.');
                                        var makeIter = function (e, idx) {
                                            var _a, _b, _c, _d;
                                            var attr = paths[idx];
                                            var rel = (0, relation_1.judgeRelation)(context.getSchema(), e, attr);
                                            if (idx === paths.length - 1) {
                                                if (rel === 2) {
                                                    (0, assert_1.default)(attr === 'user');
                                                    return {
                                                        projection: {
                                                            id: 1,
                                                            entity: 1,
                                                            entityId: 1,
                                                        },
                                                        getData: function (d) {
                                                            if (d) {
                                                                return {
                                                                    entity: e,
                                                                    entityId: d.id,
                                                                    userId: d.entityId,
                                                                };
                                                            }
                                                        },
                                                    };
                                                }
                                                else {
                                                    (0, assert_1.default)(rel === 'user');
                                                    return {
                                                        projection: (_a = {
                                                                id: 1
                                                            },
                                                            _a["".concat(attr, "Id")] = 1,
                                                            _a),
                                                        getData: function (d) {
                                                            if (d) {
                                                                return {
                                                                    entity: e,
                                                                    entityId: d.id,
                                                                    userId: d["".concat(attr, "Id")]
                                                                };
                                                            }
                                                        },
                                                    };
                                                }
                                            }
                                            if (rel === 2) {
                                                var _e = makeIter(attr, idx + 1), projection = _e.projection, getData_4 = _e.getData;
                                                return {
                                                    projection: (_b = {
                                                            id: 1
                                                        },
                                                        _b[attr] = projection,
                                                        _b),
                                                    getData: function (d) { return d[attr] && getData_4(d[attr]); },
                                                };
                                            }
                                            else if (typeof rel === 'string') {
                                                var _f = makeIter(rel, idx + 1), projection = _f.projection, getData_5 = _f.getData;
                                                return {
                                                    projection: (_c = {
                                                            id: 1
                                                        },
                                                        _c[attr] = projection,
                                                        _c),
                                                    getData: function (d) { return d[attr] && getData_5(d[attr]); },
                                                };
                                            }
                                            else {
                                                (0, assert_1.default)(rel instanceof Array);
                                                var _g = tslib_1.__read(rel, 2), e2 = _g[0], fk = _g[1];
                                                var _h = makeIter(e2, idx + 1), projection = _h.projection, getData_6 = _h.getData;
                                                return {
                                                    projection: (_d = {
                                                            id: 1
                                                        },
                                                        _d[attr] = {
                                                            $entity: e2,
                                                            data: projection,
                                                        },
                                                        _d),
                                                    getData: function (d) { return d[attr] && d[attr].map(function (ele) { return getData_6(ele); }); },
                                                };
                                            }
                                        };
                                        return makeIter(entity, 0);
                                    };
                                    return [4 /*yield*/, Promise.all(directAuths.map(function (_a) {
                                            var paths = _a.paths;
                                            return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                var _this = this;
                                                return tslib_1.__generator(this, function (_b) {
                                                    return [2 /*return*/, paths.map(function (path) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                            var _a, getData, projection, rows, userEntities;
                                                            return tslib_1.__generator(this, function (_b) {
                                                                switch (_b.label) {
                                                                    case 0:
                                                                        _a = makeRelationIterator(path), getData = _a.getData, projection = _a.projection;
                                                                        return [4 /*yield*/, context.select(entity, {
                                                                                data: projection,
                                                                                filter: filter,
                                                                            }, { dontCollect: true })];
                                                                    case 1:
                                                                        rows = _b.sent();
                                                                        userEntities = rows.map(function (ele) { return getData(ele); }).flat().filter(function (ele) { return !!ele; });
                                                                        return [2 /*return*/, userEntities];
                                                                }
                                                            });
                                                        }); })];
                                                });
                                            });
                                        }))];
                                case 1:
                                    userEntities = _a.sent();
                                    return [2 /*return*/, userEntities.flat()];
                            }
                        });
                    }); };
                    urAuths2 = actionAuths.filter(function (ele) { return !!ele.relationId; } // 有relation说明通过userRelation关联
                    );
                    directAuths2 = actionAuths.filter(function (ele) { return !ele.relationId; } // 没relation说明通过user关联
                    );
                    return [4 /*yield*/, Promise.all([getUserRelations(urAuths2), getDirectUserEntities(directAuths2)])];
                case 2:
                    _a = tslib_1.__read.apply(void 0, [_b.sent(), 2]), userRelations = _a[0], userEntities = _a[1];
                    return [2 /*return*/, {
                            userRelations: userRelations,
                            userEntities: userEntities,
                        }];
            }
        });
    });
}
exports.getUserRelationsByActions = getUserRelationsByActions;
