"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationAuth = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var action_1 = require("../actions/action");
var lodash_1 = require("../utils/lodash");
var RelationAuth = /** @class */ (function () {
    function RelationAuth(schema, actionCascadePathGraph, relationCascadePathGraph, authDeduceRelationMap, selectFreeEntities) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities;
        this.relationalChecker = {};
        this.authDeduceRelationMap = authDeduceRelationMap;
        this.constructRelationalChecker();
    }
    RelationAuth.prototype.constructRelationalChecker = function () {
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
        var findHighestAnchors = function (entity, filter, path, excludePaths) {
            var _a;
            var anchors = [];
            var anchorsOnMe = [];
            for (var attr in filter) {
                // todo $or会发生什么？by Xc
                if (attr === '$and') {
                    filter[attr].forEach(function (ele) { return anchors.push.apply(anchors, tslib_1.__spreadArray([], tslib_1.__read(findHighestAnchors(entity, ele, path, excludePaths)), false)); });
                    continue;
                }
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                if (rel === 2) {
                    var path2 = path ? "".concat(path, ".").concat(attr) : attr;
                    anchors.push.apply(anchors, tslib_1.__spreadArray([], tslib_1.__read(findHighestAnchors(attr, filter[attr], path2, excludePaths)), false));
                    if (!excludePaths[path]) {
                        excludePaths[path] = [path2];
                    }
                    else if (!excludePaths[path].includes(path2)) {
                        excludePaths[path].push(path2);
                    }
                }
                else if (typeof rel === 'string') {
                    var path2 = path ? "".concat(path, ".").concat(attr) : attr;
                    anchors.push.apply(anchors, tslib_1.__spreadArray([], tslib_1.__read(findHighestAnchors(rel, filter[attr], path2, excludePaths)), false));
                }
                else if (rel === 1 && anchors.length === 0) {
                    // 只寻找highest的，有更深的就忽略掉浅的
                    if (attr === 'entity' && pathGroup[filter.entity]) {
                        var nextPath = path ? "".concat(path, ".").concat(filter.entity) : filter.entity;
                        if (filter.entityId) {
                            anchorsOnMe.push({
                                entity: filter.entity,
                                filter: {
                                    id: filter.entityId,
                                },
                                relativePath: nextPath,
                            });
                        }
                        if (!excludePaths[path]) {
                            excludePaths[path] = [nextPath];
                        }
                        else if (!excludePaths[path].includes(nextPath)) {
                            excludePaths[path].push(nextPath);
                        }
                    }
                    else if (((_a = _this.schema[entity].attributes[attr]) === null || _a === void 0 ? void 0 : _a.type) === 'ref') {
                        var ref = _this.schema[entity].attributes[attr].ref;
                        (0, assert_1.default)(typeof ref === 'string');
                        if (pathGroup[ref] || ref === 'user') {
                            anchorsOnMe.push({
                                entity: ref,
                                filter: {
                                    id: filter[attr],
                                },
                                relativePath: path ? "".concat(path, ".").concat(attr.slice(0, attr.length - 2)) : attr.slice(0, attr.length - 2)
                            });
                        }
                    }
                }
            }
            if (anchors.length > 0) {
                return anchors;
            }
            if (anchorsOnMe.length > 0) {
                return anchorsOnMe;
            }
            if (filter.id) {
                // 直接以id作为查询目标
                return [{
                        entity: entity,
                        filter: {
                            id: filter.id,
                        },
                        relativePath: path,
                    }];
            }
            return [];
        };
        Object.keys(pathGroup).forEach(function (entity) {
            var authCascadePaths = pathGroup[entity];
            _this.relationalChecker[entity] = function (userId, actions, data, filter, userRelations) {
                var filter2 = filter || data;
                (0, assert_1.default)(filter2);
                var excludePaths = {};
                var anchors = findHighestAnchors(entity, filter2, '', excludePaths);
                if (anchors.length === 0) {
                    throw new types_1.OakException('本次查询找不到锚定权限的入口，请确认查询条件合法');
                }
                anchors.sort(function (a1, a2) { return a2.relativePath.length - a1.relativePath.length; });
                // 将这些找到的锚点和authCascadePaths进行锚定，确认userRelation的搜索范围
                var filters = authCascadePaths.filter(function (path) {
                    // 被entity的外键连接所排队的路径，这个非常重要，否则像extraFile这样的对象会有过多的查询路径
                    for (var k in excludePaths) {
                        if (path[1].startsWith(k) && !excludePaths[k].find(function (ele) { return path[1].startsWith(ele); })) {
                            return false;
                        }
                    }
                    return true;
                }).map(function (path) {
                    // 这里anchor的relativePath按长度倒排，所以找到的第一个匹配关系应该就是最准确的
                    var relatedAnchor = anchors.find(function (anchor) { return path[1].startsWith(anchor.relativePath); });
                    if (relatedAnchor) {
                        var entity_1 = relatedAnchor.entity, relativePath_1 = relatedAnchor.relativePath, filter_2 = relatedAnchor.filter;
                        var restPath = relativePath_1 === path[1] ? '' : relativePath_1 === '' ? path[1] : path[1].slice(relativePath_1.length + 1);
                        if (restPath === '') {
                            // 处理一种特殊情况，如果根结点是create，则userRelation或者userId应该附着在创建的信息上
                            if (actions[0] === 'create' && actions.length === 1) {
                                if (path[3]) {
                                    if (userRelations && userRelations.length > 0) {
                                        var relationIds = userRelations.map(function (userRelation) {
                                            (0, assert_1.default)(!(userRelation instanceof Array), '创建对象同时创建userRelation请勿将多条relation合并传入');
                                            var relationId = userRelation.relationId;
                                            return relationId;
                                        });
                                        return {
                                            relativePath: '',
                                            relationIds: relationIds,
                                            path: path,
                                        };
                                    }
                                }
                                else {
                                    if (filter_2.id === userId) {
                                        return {
                                            relativePath: '',
                                            path: path,
                                        };
                                    }
                                }
                            }
                            if (path[3]) {
                                return {
                                    relativePath: relativePath_1,
                                    path: path,
                                    filter: {
                                        entity: entity_1,
                                        entityId: filter_2.id,
                                    },
                                };
                            }
                            if (userId === filter_2.id) {
                                // 说明userId满足条件，直接返回relativePath
                                return {
                                    relativePath: '',
                                    path: path,
                                };
                            }
                            return undefined;
                        }
                        var restPaths_1 = restPath.split('.');
                        var makeFilterIter_1 = function (entity2, idx, filter2) {
                            var _a, _b;
                            if (idx === restPaths_1.length - 1) {
                                if (path[3]) {
                                    return {
                                        relativePath: relativePath_1,
                                        path: path,
                                        filter: {
                                            entity: entity2,
                                            entityId: filter2.id,
                                        },
                                    };
                                }
                                return {
                                    relativePath: relativePath_1,
                                    path: path,
                                    filter: tslib_1.__assign((_a = {}, _a["".concat(restPaths_1[idx], "Id")] = userId, _a), filter2),
                                };
                            }
                            var attr = restPaths_1[idx];
                            var rel = (0, relation_1.judgeRelation)(_this.schema, entity2, attr);
                            if (rel === 2) {
                                return makeFilterIter_1(attr, idx + 1, {
                                    id: {
                                        $in: {
                                            entity: entity2,
                                            data: {
                                                entityId: 1,
                                            },
                                            filter: tslib_1.__assign({ entity: attr }, filter2),
                                        }
                                    }
                                });
                            }
                            (0, assert_1.default)(typeof rel === 'string');
                            return makeFilterIter_1(rel, idx + 1, {
                                id: {
                                    $in: {
                                        entity: entity2,
                                        data: (_b = {},
                                            _b["".concat(attr, "Id")] = 1,
                                            _b),
                                        filter: filter2,
                                    },
                                },
                            });
                        };
                        return makeFilterIter_1(entity_1, 0, filter_2);
                    }
                }).filter(function (ele) { return !!ele; });
                (0, assert_1.default)(filters.length > 0, "\u5BF9".concat(entity, "\u8FDB\u884C").concat(actions.join(','), "\u64CD\u4F5C\u65F6\uFF0C\u627E\u4E0D\u5230\u6709\u6548\u7684\u951A\u5B9A\u6743\u9650\u641C\u7D22\u8303\u56F4"));
                if (process.env.NODE_ENV === 'development' && filters.length > 5) {
                    console.warn("\u5BF9".concat(entity, "\u8FDB\u884C").concat(actions.join(','), "\u64CD\u4F5C\u65F6\u53D1\u73B0\u4E86").concat(filters.length, "\u6761\u7684\u6743\u9650\u53EF\u80FD\u8DEF\u5F84\uFF0C\u8BF7\u4F18\u5316\u67E5\u8BE2\u6761\u4EF6\u6216\u8005\u5728relation\u4E2D\u7EA6\u675F\u6B64\u5BF9\u8C61\u53EF\u80FD\u7684\u6743\u9650\u8DEF\u5F84\u8303\u56F4"));
                }
                return function (context, oneIsEnough) {
                    if (oneIsEnough) {
                        var sureRelativePaths = filters.filter(function (ele) { return !ele.filter && !ele.relationIds; });
                        if (sureRelativePaths.length > 0) {
                            return sureRelativePaths.map(function (ele) { return ({
                                relativePath: ele.relativePath
                            }); });
                        }
                    }
                    var checkRelationResults = [];
                    var result = filters.map(function (_a) {
                        var path = _a.path, filter = _a.filter, relativePath = _a.relativePath, relationIds = _a.relationIds;
                        if (filter) {
                            var _b = tslib_1.__read(path, 4), d = _b[0], p = _b[1], s = _b[2], ir = _b[3];
                            if (ir) {
                                var urs = context.select('userRelation', {
                                    data: {
                                        id: 1,
                                        relationId: 1,
                                    },
                                    filter: tslib_1.__assign(tslib_1.__assign({ userId: userId }, filter), { relationId: {
                                            $in: {
                                                entity: 'actionAuth',
                                                data: {
                                                    relationId: 1,
                                                },
                                                filter: {
                                                    path: p,
                                                    destEntity: d,
                                                    deActions: {
                                                        $overlaps: actions,
                                                    },
                                                },
                                            },
                                        } }),
                                }, { dontCollect: true });
                                if (urs instanceof Promise) {
                                    return urs.then(function (urs2) { return urs2.map(function (ele) { return ele.relationId; }); }).then(function (relationIds) { return checkRelationResults.push.apply(checkRelationResults, tslib_1.__spreadArray([], tslib_1.__read(relationIds.map(function (relationId) { return ({
                                        relationId: relationId,
                                        relativePath: relativePath
                                    }); })), false)); });
                                }
                                checkRelationResults.push.apply(checkRelationResults, tslib_1.__spreadArray([], tslib_1.__read(urs.map(function (ele) { return ({
                                    relationId: ele.relationId,
                                    relativePath: relativePath
                                }); })), false));
                                return;
                            }
                            // 通过userId关联，直接查有没有相应的entity
                            var result2 = context.select(s, {
                                data: {
                                    id: 1,
                                },
                                filter: filter,
                            }, { dontCollect: true });
                            if (result2 instanceof Promise) {
                                return result2.then(function (e2) {
                                    if (e2.length > 0) {
                                        checkRelationResults.push({
                                            relativePath: relativePath,
                                        });
                                    }
                                });
                            }
                            if (result2.length > 0) {
                                checkRelationResults.push({
                                    relativePath: relativePath,
                                });
                            }
                            return;
                        }
                        if (relationIds) {
                            var _c = tslib_1.__read(path, 4), d = _c[0], p = _c[1], s = _c[2], ir = _c[3];
                            (0, assert_1.default)(ir && relationIds.length > 0);
                            // 既要检查在此entity上有没有创建这些relation的权限，还要检查在destEntity上有没有相应的操作权限
                            var result2 = [
                                context.select('actionAuth', {
                                    data: {
                                        id: 1,
                                    },
                                    filter: {
                                        relationId: {
                                            $in: relationIds,
                                        },
                                        deActions: {
                                            $contains: 'create',
                                        },
                                        path: '',
                                        destEntity: s,
                                    }
                                }, { dontCollect: true }),
                                context.select('actionAuth', {
                                    data: {
                                        id: 1,
                                        relationId: 1,
                                    },
                                    filter: {
                                        relationId: {
                                            $in: relationIds,
                                        },
                                        deActions: {
                                            $overlaps: actions,
                                        },
                                        path: p,
                                        destEntity: d,
                                    },
                                }, { dontCollect: true })
                            ];
                            if (result2[0] instanceof Promise) {
                                return Promise.all(result2).then(function (_a) {
                                    var _b = tslib_1.__read(_a, 2), createAas = _b[0], aas = _b[1];
                                    if (createAas.length === relationIds.length && aas.length > 0) {
                                        // create的权限数量必须和relationIds的数量一致，而本次操作的权限数量只要有一个就可以
                                        var legalRelationIds = aas.map(function (ele) { return ele.relationId; });
                                        checkRelationResults.push.apply(checkRelationResults, tslib_1.__spreadArray([], tslib_1.__read(legalRelationIds.map(function (relationId) { return ({
                                            relationId: relationId,
                                            relativePath: relativePath,
                                        }); })), false));
                                    }
                                });
                            }
                            var _d = tslib_1.__read(result2, 2), createAas = _d[0], aas = _d[1];
                            if (createAas.length === relationIds.length && aas.length > 0) {
                                // create的权限数量必须和relationIds的数量一致，而本次操作的权限数量只要有一个就可以
                                var legalRelationIds = aas.map(function (ele) { return ele.relationId; });
                                checkRelationResults.push.apply(checkRelationResults, tslib_1.__spreadArray([], tslib_1.__read(legalRelationIds.map(function (relationId) { return ({
                                    relationId: relationId,
                                    relativePath: relativePath,
                                }); })), false));
                            }
                            return;
                        }
                        // 最后一种情况，根据条件已经判定了操作可行，只要检查relativePath上的userId是不是成立
                        checkRelationResults.push({
                            relativePath: relativePath,
                        });
                    });
                    if (result[0] instanceof Promise) {
                        return Promise.all(result).then(function () { return checkRelationResults; });
                    }
                    return checkRelationResults;
                };
            };
        });
    };
    /**
     * 对Operation而言，找到最顶层对象的对应权限所在的relation，再查找actionAuth中其它子对象有无相对路径授权
     * 如一个cascade更新目标是(entity: a, action: 'update')：{
     *      b: {
     *          action: 'update',
     *          data: {
     *              c: {
     *                  action: 'update',
     *              },
     *          },
     *      },
     *      d$entity: [{
     *          action: 'create',
     *          data: {},
     *      }]
     * }
     * 则应检查的顶层对象是c，而b:update, a:update以及d:create都应该在c所对应权限的派生路径上
     * @param entity
     * @param operation
     */
    RelationAuth.prototype.destructCascadeOperation = function (entity, operation) {
        var _this = this;
        var children = [];
        var userRelations = [];
        var appendChildPath = function (path) {
            (0, assert_1.default)(userRelations.length === 0, 'userRelation必须在创建动作的最高层');
            children.forEach(function (child) {
                if (child.relativePath) {
                    child.relativePath = "".concat(child.relativePath, ".").concat(path);
                }
                else {
                    child.relativePath = path;
                }
            });
        };
        /**
         * 递归分解operation直到定位出最终的父对象，以及各子对象与之的相对路径。
         * 此函数逻辑和CascadeStore中的destructOperation相似
         * @param entity
         * @param operation
         * @param parentFilter
         */
        var destructFn = function (entity, operation, relativeRootPath, parentFilter) {
            var action = operation.action, data = operation.data, filter = operation.filter;
            var root = {
                entity: entity,
                action: action,
                data: data,
                filter: (0, filter_1.addFilterSegment)(filter, parentFilter),
            };
            (0, assert_1.default)(!(data instanceof Array)); // createMulti这种情况实际中不会出现
            var changeRoot = false;
            var _loop_1 = function (attr) {
                var _a;
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                if (rel === 2) {
                    (0, assert_1.default)(!changeRoot, 'cascadeUpdate不应产生两条父级路径');
                    (0, assert_1.default)(!relativeRootPath, 'cascadeUpdate不应产生两条父级路径');
                    changeRoot = true;
                    // 基于entity/entityId的many-to-one
                    var operationMto = data[attr];
                    var actionMto = operationMto.action, dataMto = operationMto.data, filterMto = operationMto.filter;
                    var parentFilter2 = undefined;
                    if (actionMto === 'create') {
                    }
                    else if (action === 'create') {
                        var fkId = data.entityId, entity_2 = data.entity;
                        (0, assert_1.default)(typeof fkId === 'string' || entity_2 === attr);
                        if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                            (0, assert_1.default)(filterMto.id === fkId);
                        }
                        else {
                            parentFilter2 = {
                                id: fkId,
                            };
                        }
                    }
                    else {
                        // 剩下三种情况都是B中的filter的id来自A中row的entityId
                        (0, assert_1.default)(!data.hasOwnProperty('entityId') && !data.hasOwnProperty('entity'));
                        if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                            // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                            (0, assert_1.default)(typeof filterMto.id === 'string');
                        }
                        else if (filter.entity === attr && filter.entityId) {
                            parentFilter2 = {
                                id: filter.entityId,
                            };
                        }
                        else if (filter[attr]) {
                            parentFilter2 = filter[attr];
                        }
                        else {
                            parentFilter2 = {
                                id: {
                                    $in: {
                                        entity: entity,
                                        data: {
                                            entityId: 1,
                                        },
                                        filter: (0, filter_1.addFilterSegment)({
                                            entity: attr,
                                        }, filter),
                                    }
                                },
                            };
                        }
                    }
                    appendChildPath(attr);
                    children.push({
                        entity: entity,
                        action: action,
                        relativePath: attr,
                    });
                    root = destructFn(attr, operationMto, '', parentFilter2);
                }
                else if (typeof rel === 'string') {
                    (0, assert_1.default)(!changeRoot, 'cascadeUpdate不应产生两条父级路径');
                    (0, assert_1.default)(!relativeRootPath, 'cascadeUpdate不应产生两条父级路径');
                    changeRoot = true;
                    // 基于普通外键的many-to-one
                    var operationMto = data[attr];
                    var actionMto = operationMto.action, dataMto = operationMto.data, filterMto = operationMto.filter;
                    var parentFilter2 = undefined;
                    if (actionMto === 'create') {
                    }
                    else if (action === 'create') {
                        var _b = data, _c = "".concat(attr, "Id"), fkId = _b[_c];
                        (0, assert_1.default)(typeof fkId === 'string');
                        if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                            (0, assert_1.default)(filterMto.id === fkId);
                        }
                        else {
                            parentFilter2 = {
                                id: fkId,
                            };
                        }
                    }
                    else {
                        // 剩下三种情况都是B中的filter的id来自A中row的外键
                        (0, assert_1.default)(!data.hasOwnProperty("".concat(attr, "Id")));
                        if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                            // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                            (0, assert_1.default)(typeof filterMto.id === 'string');
                        }
                        else if (filter["".concat(attr, "Id")]) {
                            parentFilter2 = {
                                id: filter["".concat(attr, "Id")],
                            };
                        }
                        else if (filter[attr]) {
                            parentFilter2 = filter[attr];
                        }
                        else {
                            parentFilter2 = {
                                id: {
                                    $in: {
                                        entity: entity,
                                        data: (_a = {},
                                            _a["".concat(attr, "Id")] = 1,
                                            _a),
                                        filter: filter,
                                    },
                                },
                            };
                        }
                    }
                    appendChildPath(attr);
                    children.push({
                        entity: entity,
                        action: action,
                        relativePath: attr,
                    });
                    root = destructFn(rel, operationMto, '', parentFilter2);
                }
                else if (rel instanceof Array) {
                    var _d = tslib_1.__read(rel, 2), entityOtm_1 = _d[0], foreignKey = _d[1];
                    var otmOperations = data[attr];
                    if (entityOtm_1 === 'userRelation' && entity !== 'user') {
                        (0, assert_1.default)(!relativeRootPath, 'userRelation只能创建在最顶层');
                        var dealWithUserRelation_1 = function (userRelation) {
                            var action = userRelation.action, data = userRelation.data;
                            (0, assert_1.default)(action === 'create', 'cascade更新中只允许创建userRelation');
                            var attrs = Object.keys(data);
                            (0, assert_1.default)((0, lodash_1.difference)(attrs, Object.keys(_this.schema.userRelation.attributes).concat('id')).length === 0);
                            userRelations.push(data);
                        };
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach(function (otmOperation) { return dealWithUserRelation_1(otmOperation); });
                        }
                        else {
                            dealWithUserRelation_1(otmOperations);
                        }
                    }
                    else {
                        var subPath = foreignKey ? foreignKey.slice(0, foreignKey.length - 2) : entity;
                        var relativeRootPath2_1 = relativeRootPath ? "".concat(subPath, ".").concat(relativeRootPath) : subPath;
                        var dealWithOneToMany_1 = function (otm) {
                            // 一对多之后不允许再有多对一的关系（cascadeUpdate更新必须是一棵树，不允许森林）
                            destructFn(entityOtm_1, otm, relativeRootPath2_1);
                        };
                        if (otmOperations instanceof Array) {
                            var actionDict_1 = {};
                            otmOperations.forEach(function (otmOperation) {
                                var action = otmOperation.action;
                                if (!actionDict_1[action]) {
                                    actionDict_1[action] = 1;
                                }
                                dealWithOneToMany_1(otmOperation);
                            });
                            Object.keys(actionDict_1).forEach(function (action) { return children.push({
                                entity: entityOtm_1,
                                action: action,
                                relativePath: relativeRootPath2_1,
                            }); });
                        }
                        else {
                            var actionOtm = otmOperations.action;
                            dealWithOneToMany_1(otmOperations);
                            children.push({
                                entity: entityOtm_1,
                                action: actionOtm,
                                relativePath: relativeRootPath2_1,
                            });
                        }
                    }
                }
            };
            for (var attr in data) {
                _loop_1(attr);
            }
            return root;
        };
        var root = destructFn(entity, operation, '');
        return {
            root: root,
            children: children,
            userRelations: userRelations,
        };
    };
    // 前台检查filter是否满足relation约束
    RelationAuth.prototype.checkRelationSync = function (entity, operation, context) {
        if (context.isRoot()) {
            return;
        }
        var action = operation.action || 'select';
        if (action === 'select' && this.selectFreeEntities.includes(entity)) {
            return;
        }
        this.checkActions(entity, operation, context);
    };
    RelationAuth.prototype.getDeducedCheckOperation = function (entity, operation) {
        var e_1, _a;
        // 如果是deduce的对象，将之转化为所deduce的对象上的权限检查            
        var deduceAttr = this.authDeduceRelationMap[entity];
        (0, assert_1.default)(deduceAttr === 'entity', "\u5F53\u524D\u53EA\u652F\u6301entity\u4F5C\u4E3Adeduce\u5916\u952E\uFF0Centity\u662F\u300C".concat(entity, "\u300D"));
        var data = operation.data, filter = operation.filter;
        var action = operation.action || 'select';
        if (action === 'create') {
            var deduceEntity = '', deduceEntityId = '';
            if (filter) {
                // 有filter优先判断filter
                deduceEntity = filter.entity;
                deduceEntityId = filter.entityId;
                (0, assert_1.default)(deduceEntity, "".concat(entity, "\u5BF9\u8C61\u4E0A\u7684").concat(action, "\u884C\u4E3A\uFF0Cfilter\u4E2D\u5FC5\u987B\u5E26\u4E0A").concat(deduceAttr, "\u7684\u5916\u952E\u6761\u4EF6"));
                (0, assert_1.default)(deduceEntityId, "".concat(entity, "\u5BF9\u8C61\u4E0A\u7684").concat(action, "\u884C\u4E3A\uFF0Cfilter\u4E2D\u5FC5\u987B\u5E26\u4E0A").concat(deduceAttr, "Id\u7684\u5916\u952E\u6761\u4EF6"));
            }
            else if (data instanceof Array) {
                try {
                    for (var data_1 = tslib_1.__values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
                        var d = data_1_1.value;
                        if (!deduceEntity) {
                            deduceEntity = d.entity;
                            (0, assert_1.default)(deduceEntity);
                            deduceEntityId = d.entityId;
                            (0, assert_1.default)(deduceEntityId);
                        }
                        else {
                            // 前端应该不会有这种意外发生
                            (0, assert_1.default)(d.entity === deduceEntity, "\u540C\u4E00\u6279create\u53EA\u80FD\u6307\u5411\u540C\u4E00\u4E2A\u5BF9\u8C61");
                            (0, assert_1.default)(d.entityId === deduceEntityId, '同一批create应指向同一个外键');
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            else {
                deduceEntity = data.entity;
                deduceEntityId = data.entityId;
                (0, assert_1.default)(deduceEntity);
                (0, assert_1.default)(deduceEntityId);
            }
            var excludeActions_1 = action_1.readOnlyActions.concat(['create', 'remove']);
            var updateActions = this.schema[deduceEntity].actions.filter(function (a) { return !excludeActions_1.includes(a); });
            return {
                entity: deduceEntity,
                operation: {
                    action: 'update',
                    data: {},
                    filter: {
                        id: deduceEntityId,
                    },
                },
                actions: updateActions,
            };
        }
        else {
            // 目前应该都有这两个属性，包括select
            var _b = filter, deduceEntity = _b.entity, deduceEntityId = _b.entityId;
            (0, assert_1.default)(deduceEntity, "".concat(entity, "\u5BF9\u8C61\u4E0A\u7684").concat(action, "\u884C\u4E3A\uFF0C\u5FC5\u987B\u5E26\u4E0A").concat(deduceAttr, "\u7684\u5916\u952E\u6761\u4EF6"));
            (0, assert_1.default)(deduceEntityId, "".concat(entity, "\u5BF9\u8C61\u4E0A\u7684").concat(action, "\u884C\u4E3A\uFF0C\u5FC5\u987B\u5E26\u4E0A").concat(deduceAttr, "Id\u7684\u5916\u952E\u6761\u4EF6"));
            if (action === 'select') {
                return {
                    entity: deduceEntity,
                    operation: {
                        action: 'select',
                        data: { id: 1 },
                        filter: { id: deduceEntityId },
                    }
                };
            }
            else {
                // 目前对于非select和create的action，只要有其父对象的update/remove属性即可以
                var excludeActions_2 = action_1.readOnlyActions.concat(['create']);
                var updateActions = this.schema[deduceEntity].actions.filter(function (a) { return !excludeActions_2.includes(a); });
                return {
                    entity: deduceEntity,
                    operation: {
                        action: 'update',
                        data: {},
                        filter: {
                            id: deduceEntityId,
                        },
                    },
                    actions: updateActions,
                };
            }
        }
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
                sourceRelationId: {
                    $in: {
                        entity: 'userRelation',
                        data: {
                            relationId: 1,
                        },
                        filter: {
                            userId: context.getCurrentUserId(),
                        },
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
    RelationAuth.prototype.checkSpecialEntity = function (entity, operation, context) {
        var _this = this;
        var action = operation.action || 'select';
        switch (action) {
            case 'select': {
                if (['relation', 'actionAuth', 'relationAuth', 'user', 'userEntityGrant'].includes(entity)) {
                    return;
                }
                if (entity === 'userRelation') {
                    var filter = operation.filter;
                    if ((filter === null || filter === void 0 ? void 0 : filter.userId) === context.getCurrentUserId()) {
                        return;
                    }
                    else {
                        // 查询某一对象的relation，意味着该用户有权利管辖该对象上至少某一种relation的操作权限
                        var userId = context.getCurrentUserId();
                        operation.filter = (0, filter_1.addFilterSegment)({
                            relationId: {
                                $in: {
                                    entity: 'relationAuth',
                                    data: {
                                        destRelationId: 1,
                                    },
                                    filter: {
                                        sourceRelationId: {
                                            $in: {
                                                entity: 'userRelation',
                                                data: {
                                                    relationId: 1,
                                                },
                                                filter: {
                                                    userId: userId,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        }, operation.filter);
                        return;
                    }
                }
                break;
            }
            default: {
                switch (entity) {
                    case 'userRelation': {
                        var _a = operation, filter = _a.filter, data = _a.data, action_2 = _a.action;
                        (0, assert_1.default)(!(data instanceof Array));
                        (0, assert_1.default)(['create', 'remove'].includes(action_2));
                        if (action_2 === 'create') {
                            (0, assert_1.default)(!(data instanceof Array));
                            var _b = data, entity_3 = _b.entity, entityId_1 = _b.entityId, relationId_1 = _b.relationId;
                            var destRelations = this.getGrantedRelationIds(entity_3, entityId_1, context);
                            if (destRelations instanceof Promise) {
                                return destRelations.then(function (r2) {
                                    if (!r2.find(function (ele) { return ele.id === relationId_1; })) {
                                        throw new types_1.OakUserUnpermittedException("\u5F53\u524D\u7528\u6237\u6CA1\u6709\u4E3Aid\u4E3A\u300C".concat(entityId_1, "\u300D\u7684\u300C").concat(entity_3, "\u300D\u5BF9\u8C61\u521B\u5EFA\u300C").concat(relationId_1, "\u300D\u4EBA\u5458\u5173\u7CFB\u7684\u6743\u9650"));
                                    }
                                });
                            }
                            if (!destRelations.find(function (ele) { return ele.id === relationId_1; })) {
                                throw new types_1.OakUserUnpermittedException("\u5F53\u524D\u7528\u6237\u6CA1\u6709\u4E3Aid\u4E3A\u300C".concat(entityId_1, "\u300D\u7684\u300C").concat(entity_3, "\u300D\u5BF9\u8C61\u521B\u5EFA\u300C").concat(relationId_1, "\u300D\u4EBA\u5458\u5173\u7CFB\u7684\u6743\u9650"));
                            }
                        }
                        else {
                            // remove加上限制条件
                            var userId = context.getCurrentUserId();
                            (0, assert_1.default)(filter);
                            operation.filter = (0, filter_1.addFilterSegment)({
                                relationId: {
                                    $in: {
                                        entity: 'relationAuth',
                                        data: {
                                            destRelationId: 1,
                                        },
                                        filter: {
                                            sourceRelationId: {
                                                $in: {
                                                    entity: 'userRelation',
                                                    data: {
                                                        relationId: 1,
                                                    },
                                                    filter: {
                                                        userId: userId,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            }, filter);
                        }
                        return;
                    }
                    case 'user': {
                        // 对用户的操作由应用自己去管理权限，这里只检查grant/revoke
                        var data = operation.data;
                        if (data.hasOwnProperty('userRelation$user')) {
                            var userRelation$user = data.userRelation$user;
                            var checkUrOperation_1 = function (urOperation) { return _this.checkSpecialEntity('userRelation', urOperation, context); };
                            if (userRelation$user instanceof Array) {
                                var result = userRelation$user.map(function (ur) { return checkUrOperation_1(ur); });
                                if (result[0] instanceof Promise) {
                                    return Promise.all(result);
                                }
                                return;
                            }
                            return checkUrOperation_1(userRelation$user);
                        }
                        return;
                    }
                    default: {
                        break;
                    }
                }
                break;
            }
        }
        (0, assert_1.default)(false, "".concat(entity, "\u7684").concat(action, "\u6743\u9650\u8FD8\u672A\u8BE6\u5316\u5904\u7406"));
    };
    RelationAuth.prototype.checkActions = function (entity, operation, context, actions) {
        var action = operation.action || 'select';
        var userId = context.getCurrentUserId();
        if (this.authDeduceRelationMap[entity]) {
            var _a = this.getDeducedCheckOperation(entity, operation), deduceEntity = _a.entity, deduceOperation = _a.operation, actions_1 = _a.actions;
            return this.checkActions(deduceEntity, deduceOperation, context, actions_1);
        }
        if (action === 'select') {
            // select的权限检查发生在每次cascadeSelect时，如果有多对一的join，被join的实体不需要检查
            if (['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity', 'userRelation', 'actionAuth',
                'freeActionAuth', 'relationAuth', 'userEntityGrant', 'relation'].includes(entity)) {
                return this.checkSpecialEntity(entity, operation, context);
            }
            if (!this.relationalChecker[entity]) {
                throw new types_1.OakUserUnpermittedException("\u5904\u7406".concat(entity, "\u4E0A\u4E0D\u5B58\u5728\u6709\u6548\u7684actionPath"));
            }
            var checker = this.relationalChecker[entity](userId, actions || ['select'], undefined, operation.filter);
            var result = checker(context, true);
            if (result instanceof Promise) {
                return result.then(function (r2) {
                    if (r2.length === 0) {
                        throw new types_1.OakUserUnpermittedException("\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743"));
                    }
                });
            }
            if (result.length === 0) {
                throw new types_1.OakUserUnpermittedException("\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743"));
            }
        }
        else {
            // operate的权限检查只发生一次，需要在这次检查中将所有cascade的对象的权限检查完成
            // 算法是先将整个update的根结点对象找到，并找到为其赋权的relation，再用此relation去查找所有子对象上的actionAuth
            var result = [];
            var _b = this.destructCascadeOperation(entity, operation), root = _b.root, children_1 = _b.children, userRelations = _b.userRelations;
            var e_2 = root.entity, d = root.data, f = root.filter, a = root.action;
            if (userRelations.length > 0) {
                (0, assert_1.default)(e_2 !== 'user');
                (0, assert_1.default)(a === 'create' && !(d instanceof Array));
                var createIds_1 = userRelations.map(function (ele) { return ele.relationId; });
                // 这里处理的是创建对象时顺带创建相关权限，要检查该权限是不是有create动作授权
                var aas = context.select('actionAuth', {
                    data: {
                        id: 1,
                        relationId: 1,
                    },
                    filter: {
                        destEntity: e_2,
                        deActions: {
                            $contains: 'create',
                        },
                        path: '',
                    },
                }, { dontCollect: true });
                if (aas instanceof Promise) {
                    result.push(aas.then(function (aas2) {
                        var relationIds = aas2.map(function (ele) { return ele.relationId; });
                        var diff = (0, lodash_1.difference)(createIds_1, relationIds);
                        if (diff.length > 0) {
                            throw new types_1.OakUserUnpermittedException("\u60A8\u65E0\u6743\u521B\u5EFA\u300C".concat(e_2, "\u300D\u5BF9\u8C61\u4E0Aid\u4E3A\u300C").concat(diff.join(','), "\u300D\u7684\u7528\u6237\u6743\u9650"));
                        }
                    }));
                }
                else {
                    var relationIds = aas.map(function (ele) { return ele.relationId; });
                    var diff = (0, lodash_1.difference)(createIds_1, relationIds);
                    if (diff.length > 0) {
                        throw new types_1.OakUserUnpermittedException("\u60A8\u65E0\u6743\u521B\u5EFA\u300C".concat(e_2, "\u300D\u5BF9\u8C61\u4E0Aid\u4E3A\u300C").concat(diff.join(','), "\u300D\u7684\u7528\u6237\u6743\u9650"));
                    }
                }
            }
            if (['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity', 'userRelation', 'actionAuth',
                'freeActionAuth', 'relationAuth', 'userEntityGrant', 'relation'].includes(e_2)) {
                // 只要根对象能检查通过就算通过（暂定这个策略）                
                var r = this.checkSpecialEntity(e_2, {
                    action: a,
                    data: d,
                    filter: f,
                }, context);
                if (r instanceof Promise) {
                    result.push(r);
                }
            }
            else {
                if (!this.relationalChecker[e_2]) {
                    throw new types_1.OakUserUnpermittedException("".concat(root.entity, "\u4E0A\u4E0D\u5B58\u5728\u6709\u6548\u7684actionPath"));
                }
                var checker = this.relationalChecker[root.entity](userId, actions || [root.action], root.data, root.filter, userRelations);
                var r = checker(context, children_1.length === 0);
                var checkChildrenAuth_1 = function (relativePath, relationId) {
                    var filters = children_1.map(function (_a) {
                        var entity = _a.entity, action = _a.action, childPath = _a.relativePath;
                        var path = relativePath ? "".concat(childPath, ".").concat(relativePath) : childPath;
                        return {
                            path: path,
                            destEntity: entity,
                            deActions: {
                                $contains: action,
                            }
                        };
                    });
                    if (relationId) {
                        // 有relationId，说明是userRelation赋权，查找actionAuth中有无相应的行
                        // 为了节省性能，合并成一个or查询
                        var r2 = context.select('actionAuth', {
                            data: {
                                id: 1,
                                path: 1,
                                destEntity: 1,
                                deActions: 1,
                            },
                            filter: {
                                $or: filters,
                                relationId: relationId,
                            }
                        }, { dontCollect: true });
                        var checkActionAuth_1 = function (actionAuths) {
                            var missedChild = children_1.find(function (_a) {
                                var entity = _a.entity, action = _a.action, childPath = _a.relativePath;
                                var path = relativePath ? "".concat(childPath, ".").concat(relativePath) : childPath;
                                return !actionAuths.find(function (ele) { var _a; return ele.path === path && ((_a = ele.deActions) === null || _a === void 0 ? void 0 : _a.includes(action)) && ele.destEntity === entity; });
                            });
                            if (missedChild) {
                                return new types_1.OakUserUnpermittedException("\u5BF9\u300C".concat(missedChild.entity, "\u300D\u8FDB\u884C\u300C").concat(missedChild.action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743"));
                            }
                        };
                        if (r2 instanceof Promise) {
                            return r2.then(function (r3) { return checkActionAuth_1(r3); });
                        }
                        return checkActionAuth_1(r2);
                    }
                    else {
                        // 取消directActionAuth，发现root对象能过，则子对象全部自动通过
                        return;
                    }
                };
                if (r instanceof Promise) {
                    result.push(r.then(function (r2) { return Promise.all(r2.map(function (_a) {
                        var relativePath = _a.relativePath, relationId = _a.relationId;
                        return checkChildrenAuth_1(relativePath, relationId);
                    })); }).then(function (r3) {
                        if (r3.length === 0) {
                            throw new types_1.OakUserUnpermittedException("\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743"));
                        }
                        if (r3.indexOf(undefined) >= 0) {
                            // 有一个过就证明能过
                            return;
                        }
                        throw r3[0];
                    }));
                }
                else {
                    var r3 = r.map(function (_a) {
                        var relativePath = _a.relativePath, relationId = _a.relationId;
                        return checkChildrenAuth_1(relativePath, relationId);
                    });
                    if (r3.length > 0 && r3.includes(undefined)) {
                        // 有一个过就证明能过
                    }
                    else {
                        throw r3[0] || new types_1.OakUserUnpermittedException("\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743"));
                    }
                }
            }
            if (result.length > 0) {
                return Promise.all(result);
            }
        }
    };
    // 后台检查filter是否满足relation约束
    RelationAuth.prototype.checkRelationAsync = function (entity, operation, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (context.isRoot()) {
                            return [2 /*return*/];
                        }
                        action = operation.action || 'select';
                        if (action === 'select' && this.selectFreeEntities.includes(entity)) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.checkActions(entity, operation, context)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return RelationAuth;
}());
exports.RelationAuth = RelationAuth;
