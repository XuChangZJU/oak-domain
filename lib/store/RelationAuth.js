"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationAuth = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var AsyncRowStore_1 = require("./AsyncRowStore");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var SyncRowStore_1 = require("./SyncRowStore");
var action_1 = require("../actions/action");
var lodash_1 = require("../utils/lodash");
var RelationAuth = /** @class */ (function () {
    function RelationAuth(schema, actionCascadePathGraph, relationCascadePathGraph, authDeduceRelationMap, selectFreeEntities) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities;
        this.relationalChecker = {};
        this.authDeduceRelationMap = Object.assign({}, authDeduceRelationMap, {
            modi: 'entity',
        });
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
            var _loop_1 = function (attr) {
                if (attr === '$and') {
                    filter[attr].forEach(function (ele) { return anchors.push.apply(anchors, tslib_1.__spreadArray([], tslib_1.__read(findHighestAnchors(entity, ele, path, excludePaths)), false)); });
                    return "continue";
                }
                else if (attr.startsWith('$') || attr.startsWith('#')) {
                    return "continue";
                }
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                if (rel === 2) {
                    var path2 = path ? "".concat(path, ".").concat(attr) : attr;
                    anchors.push.apply(anchors, tslib_1.__spreadArray([], tslib_1.__read(findHighestAnchors(attr, filter[attr], path2, excludePaths)), false));
                    var attributes = _this.schema[entity].attributes;
                    var ref = attributes.entity.ref;
                    (0, assert_1.default)(ref instanceof Array);
                    ref.forEach(function (refEntity) {
                        if (refEntity !== attr) {
                            var refEntityPath = path ? "".concat(path, ".").concat(refEntity) : refEntity;
                            excludePaths.push(refEntityPath);
                        }
                    });
                }
                else if (typeof rel === 'string') {
                    var path2 = path ? "".concat(path, ".").concat(attr) : attr;
                    anchors.push.apply(anchors, tslib_1.__spreadArray([], tslib_1.__read(findHighestAnchors(rel, filter[attr], path2, excludePaths)), false));
                }
                else if (rel === 1) {
                    if (attr === 'entity' && (pathGroup[filter.entity] || filter.entity === 'user')) {
                        var nextPath = path ? "".concat(path, ".").concat(filter.entity) : filter.entity;
                        if (filter.entityId) {
                            anchors.push({
                                entity: filter.entity,
                                filter: {
                                    id: filter.entityId,
                                },
                                relativePath: nextPath,
                            });
                        }
                        var attributes = _this.schema[entity].attributes;
                        var ref = attributes.entity.ref;
                        (0, assert_1.default)(ref instanceof Array);
                        ref.forEach(function (refEntity) {
                            if (refEntity !== filter.entity) {
                                var refEntityPath = path ? "".concat(path, ".").concat(refEntity) : refEntity;
                                excludePaths.push(refEntityPath);
                            }
                        });
                    }
                    else if (((_a = _this.schema[entity].attributes[attr]) === null || _a === void 0 ? void 0 : _a.type) === 'ref') {
                        var ref = _this.schema[entity].attributes[attr].ref;
                        (0, assert_1.default)(typeof ref === 'string');
                        if (pathGroup[ref] || ref === 'user') {
                            anchors.push({
                                entity: ref,
                                filter: {
                                    id: filter[attr],
                                },
                                relativePath: path ? "".concat(path, ".").concat(attr.slice(0, attr.length - 2)) : attr.slice(0, attr.length - 2)
                            });
                        }
                    }
                }
            };
            for (var attr in filter) {
                _loop_1(attr);
            }
            if (anchors.length > 0) {
                return anchors;
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
                if (!filter2) {
                    // 到这里如果没有限定条件，可以直接报错。要放在这里的原因是对root的判断太深，设计上可能有点问题 by Xc 20230717
                    return '没有限定查询条件，无法进行合法的权限判定';
                }
                var excludePaths = [];
                var anchors = findHighestAnchors(entity, filter2, '', excludePaths);
                if (anchors.length === 0) {
                    return '本次查询找不到锚定权限的入口，请确认查询条件合法';
                }
                anchors.sort(function (a1, a2) { return a2.relativePath.length - a1.relativePath.length; });
                // 将这些找到的锚点和authCascadePaths进行锚定，确认userRelation的搜索范围
                var filters = authCascadePaths.filter(function (path) {
                    var e_1, _a;
                    try {
                        // 被entity的外键连接所排队的路径，这个非常重要，否则像extraFile这样的对象会有过多的查询路径
                        for (var excludePaths_1 = tslib_1.__values(excludePaths), excludePaths_1_1 = excludePaths_1.next(); !excludePaths_1_1.done; excludePaths_1_1 = excludePaths_1.next()) {
                            var excludePath = excludePaths_1_1.value;
                            if (path[1].startsWith("".concat(excludePath, ".")) || path[1] === excludePath) {
                                return false;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (excludePaths_1_1 && !excludePaths_1_1.done && (_a = excludePaths_1.return)) _a.call(excludePaths_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return true;
                }).map(function (path) {
                    // 这里anchor的relativePath按长度倒排，所以找到的第一个匹配关系应该就是最准确的
                    var relatedAnchor = anchors.find(function (anchor) { return path[1].startsWith("".concat(anchor.relativePath, "."))
                        || path[1] === anchor.relativePath
                        || !anchor.relativePath; } // relativePath如果是'', 所有的路径都成立
                    );
                    if (relatedAnchor) {
                        var entity_1 = relatedAnchor.entity, relativePath = relatedAnchor.relativePath, filter_2 = relatedAnchor.filter;
                        var restPath = relativePath === path[1] ? '' : relativePath === '' ? path[1] : path[1].slice(relativePath.length + 1);
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
                                            relativePath: path[1],
                                            relationIds: relationIds,
                                            path: path,
                                        };
                                    }
                                }
                                else {
                                    if (filter_2.id === userId) {
                                        return {
                                            relativePath: path[1],
                                            path: path,
                                        };
                                    }
                                }
                            }
                            if (path[3]) {
                                return {
                                    relativePath: path[1],
                                    path: path,
                                    filter: {
                                        entity: entity_1,
                                        entityId: filter_2.id,
                                    },
                                };
                            }
                            else if (userId === filter_2.id) {
                                // 说明userId满足条件，直接返回relativePath
                                return {
                                    relativePath: path[1],
                                    path: path,
                                };
                            }
                            return undefined;
                        }
                        var restPaths_1 = restPath.split('.');
                        var makeFilterIter_1 = function (entity2, idx, filter2) {
                            var _a, _b;
                            // 这里如果不是relation关系，则最后一项是指向user的外键名，否则最后一项就是最后一层的对象，有区别
                            if (idx === restPaths_1.length - 1 && !path[3]) {
                                var rel_1 = (0, relation_1.judgeRelation)(_this.schema, entity2, restPaths_1[idx]);
                                if (rel_1 === 2) {
                                    return {
                                        relativePath: path[1],
                                        path: path,
                                        filter: tslib_1.__assign({ entity: 'user', entityId: userId }, filter2),
                                    };
                                }
                                (0, assert_1.default)(typeof rel_1 === 'string');
                                return {
                                    relativePath: path[1],
                                    path: path,
                                    filter: tslib_1.__assign((_a = {}, _a["".concat(restPaths_1[idx], "Id")] = userId, _a), filter2),
                                };
                            }
                            else if (idx === restPaths_1.length && path[3]) {
                                return {
                                    relativePath: path[1],
                                    path: path,
                                    filter: {
                                        entity: entity2,
                                        entityId: filter2.id,
                                    },
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
                                    filter: tslib_1.__assign(tslib_1.__assign({ userId: userId }, filter), { relation: {
                                            actionAuth$relation: {
                                                path: p,
                                                destEntity: d,
                                                deActions: {
                                                    $overlaps: actions,
                                                },
                                            }
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
            var _loop_2 = function (attr) {
                var _a;
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                if (rel === 2) {
                    (0, assert_1.default)(!_this.authDeduceRelationMap[attr], 'deduceRelation的entity只应当出现在一对多的路径上');
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
                    (0, assert_1.default)(!_this.authDeduceRelationMap[attr], 'deduceRelation的entity只应当出现在一对多的路径上');
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
                    // 如果是一对多的deduceRelation，可以忽略，其父对象能过就行
                    if (!_this.authDeduceRelationMap[entityOtm_1]) {
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
                }
            };
            for (var attr in data) {
                _loop_2(attr);
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
        this.checkActions2(entity, operation, context);
    };
    RelationAuth.prototype.getDeducedCheckOperation = function (entity, operation) {
        var e_2, _a, e_3, _b;
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
                // assert(deduceEntity, `${entity as string}对象上的${action}行为，filter中必须带上${deduceAttr as string}的外键条件`);
                // assert(deduceEntityId, `${entity as string}对象上的${action}行为，filter中必须带上${deduceAttr as string}Id的外键条件`);
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
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                deduceEntity = data.entity;
                deduceEntityId = data.entityId;
                // assert(deduceEntity);
                // assert(deduceEntityId);
            }
            if (deduceEntity && deduceEntityId) {
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
        }
        else {
            // 目前应该都有这两个属性，包括select
            var _c = filter, deduceEntity = _c.entity, deduceEntityId = _c.entityId;
            // assert(deduceEntity, `${entity as string}对象上的${action}行为，必须带上${deduceAttr as string}的外键条件`);
            // assert(deduceEntityId, `${entity as string}对象上的${action}行为，必须带上${deduceAttr as string}Id的外键条件`);
            var deduceFilter = {};
            if (deduceEntity && deduceEntityId) {
                deduceFilter = { id: deduceEntityId };
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
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (ref_1_1 && !ref_1_1.done && (_b = ref_1.return)) _b.call(ref_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            if (deduceEntity && deduceFilter) {
                if (action === 'select') {
                    return {
                        entity: deduceEntity,
                        operation: {
                            action: 'select',
                            data: { id: 1 },
                            filter: deduceFilter,
                        }
                    };
                }
                else {
                    // 目前对于非select和create的action，只要有其父对象的某一update/remove属性即可以（这样设计可能不严谨）
                    var excludeActions_2 = action_1.readOnlyActions.concat(['create']);
                    var updateActions = this.schema[deduceEntity].actions.filter(function (a) { return !excludeActions_2.includes(a); });
                    return {
                        entity: deduceEntity,
                        operation: {
                            action: 'update',
                            data: {},
                            filter: deduceFilter,
                        },
                        actions: updateActions,
                    };
                }
            }
            else if (process.env.NODE_ENV === 'development') {
                console.warn("\u5BF9\u53EFdeduce\u6743\u9650\u7684\u5BF9\u8C61".concat(entity, "\u7684\u52A8\u4F5C").concat(action, "\u627E\u4E0D\u5230\u53EF\u63A8\u5BFC\u7684\u5916\u952E\u5173\u7CFB\uFF0C\u8BF7\u68C0\u67E5\u662F\u5426\u5E94\u8BE5\u5E26\u4E0A\u8BE5\u5916\u952E\u518D\u5904\u7406"));
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
    RelationAuth.prototype.checkSpecialEntity = function (entity, operation, context) {
        var _this = this;
        var action = operation.action || 'select';
        switch (action) {
            case 'select': {
                if (['relation', 'actionAuth', 'relationAuth', 'user', 'userEntityGrant', 'oper', 'operEntity'].includes(entity)) {
                    return '';
                }
                if (entity === 'userRelation') {
                    var filter = operation.filter;
                    if ((filter === null || filter === void 0 ? void 0 : filter.userId) === context.getCurrentUserId()) {
                        return '';
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
                        return '';
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
                                        return "\u5F53\u524D\u7528\u6237\u6CA1\u6709\u4E3Aid\u4E3A\u300C".concat(entityId_1, "\u300D\u7684\u300C").concat(entity_3, "\u300D\u5BF9\u8C61\u521B\u5EFA\u300C").concat(relationId_1, "\u300D\u4EBA\u5458\u5173\u7CFB\u7684\u6743\u9650");
                                    }
                                    return '';
                                });
                            }
                            if (!destRelations.find(function (ele) { return ele.id === relationId_1; })) {
                                return "\u5F53\u524D\u7528\u6237\u6CA1\u6709\u4E3Aid\u4E3A\u300C".concat(entityId_1, "\u300D\u7684\u300C").concat(entity_3, "\u300D\u5BF9\u8C61\u521B\u5EFA\u300C").concat(relationId_1, "\u300D\u4EBA\u5458\u5173\u7CFB\u7684\u6743\u9650");
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
                        return '';
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
                                    return Promise.all(result).then(function (r2) { return r2.join(''); });
                                }
                                return result.join('');
                            }
                            return checkUrOperation_1(userRelation$user);
                        }
                        return '';
                    }
                    case 'userEntityGrant': {
                        // 对userEntityGrant进行操作，权限上等价于对此权限进行授权操作
                        var _c = operation, filter = _c.filter, data = _c.data, action_3 = _c.action;
                        (0, assert_1.default)(!(data instanceof Array));
                        (0, assert_1.default)(['create', 'remove'].includes(action_3));
                        if (action_3 === 'create') {
                            (0, assert_1.default)(!(data instanceof Array));
                            var _d = data, entity_4 = _d.entity, entityId_2 = _d.entityId, relationId_2 = _d.relationId;
                            var destRelations = this.getGrantedRelationIds(entity_4, entityId_2, context);
                            if (destRelations instanceof Promise) {
                                return destRelations.then(function (r2) {
                                    if (!r2.find(function (ele) { return ele.id === relationId_2; })) {
                                        return "\u5F53\u524D\u7528\u6237\u6CA1\u6709\u4E3Aid\u4E3A\u300C".concat(entityId_2, "\u300D\u7684\u300C").concat(entity_4, "\u300D\u5BF9\u8C61\u521B\u5EFA\u300C").concat(relationId_2, "\u300D\u4E0A\u6388\u6743\u7684\u6743\u9650");
                                    }
                                    return '';
                                });
                            }
                            if (!destRelations.find(function (ele) { return ele.id === relationId_2; })) {
                                return "\u5F53\u524D\u7528\u6237\u6CA1\u6709\u4E3Aid\u4E3A\u300C".concat(entityId_2, "\u300D\u7684\u300C").concat(entity_4, "\u300D\u5BF9\u8C61\u521B\u5EFA\u300C").concat(relationId_2, "\u300D\u4EBA\u5458\u5173\u7CFB\u7684\u6743\u9650");
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
                        return '';
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
    RelationAuth.prototype.tryCheckDeducedAuth = function (entity, operation, context, actions) {
        if (this.authDeduceRelationMap[entity]) {
            var deducedResult = this.getDeducedCheckOperation(entity, operation);
            if (deducedResult) {
                var deduceEntity = deducedResult.entity, deduceOperation = deducedResult.operation, deduceActions = deducedResult.actions;
                (0, assert_1.default)(!this.authDeduceRelationMap[deduceEntity], '目前不应出现连续的deduceRelationAuth');
                return this.tryCheckSelfAuth(deduceEntity, deduceOperation, context, deduceActions);
            }
            return "".concat(entity, "\u4E0A\u867D\u7136\u6709deduce\u6743\u9650\u4F46\u4E0D\u5B58\u5728\u76F8\u5E94\u7684\u67E5\u8BE2\u8DEF\u5F84");
        }
        return "".concat(entity, "\u4E0A\u4E0D\u5B58\u5728\u6709\u6548\u7684deduce\u6743\u9650");
    };
    RelationAuth.prototype.tryCheckSelfAuth = function (entity, operation, context, actions) {
        var action = operation.action || 'select';
        var userId = context.getCurrentUserId();
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
            if (typeof checker === 'string') {
                return checker;
            }
            var result = checker(context, true);
            if (result instanceof Promise) {
                return result.then(function (r2) {
                    if (r2.length === 0) {
                        return "\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743");
                    }
                    return '';
                });
            }
            if (result.length === 0) {
                return "\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743");
            }
        }
        else {
            // operate的权限检查只发生一次，需要在这次检查中将所有cascade的对象的权限检查完成
            // 算法是先将整个update的根结点对象找到，并找到为其赋权的relation，再用此relation去查找所有子对象上的actionAuth
            var result = [];
            var _a = this.destructCascadeOperation(entity, operation), root = _a.root, children_1 = _a.children, userRelations = _a.userRelations;
            var e = root.entity, d = root.data, f = root.filter, a = root.action;
            if (userRelations.length > 0) {
                (0, assert_1.default)(e !== 'user');
                (0, assert_1.default)(!(d instanceof Array));
                var createIds_1 = userRelations.map(function (ele) { return ele.relationId; });
                /**
                 * 当某一个对象更新授予权限时，有两种情况：
                 * 1）当前用户有授予此权限的权限
                 * 2）当前权限可以在创建的时候自动被创建(根据actionAuth的path = ''同时有create权限来判定)
                 */
                var promises = [
                    context.select('relationAuth', {
                        data: {
                            id: 1,
                            destRelationId: 1,
                        },
                        filter: {
                            destRelationId: {
                                $in: createIds_1,
                            },
                            sourceRelation: {
                                userRelation$relation: {
                                    userId: userId,
                                },
                            },
                        }
                    }, { dontCollect: true }),
                    action === 'create' && context.select('actionAuth', {
                        data: {
                            id: 1,
                            relationId: 1,
                        },
                        filter: {
                            destEntity: e,
                            deActions: {
                                $contains: 'create',
                            },
                            path: '',
                        },
                    }, { dontCollect: true })
                ];
                var checkRelationLegal_1 = function (selectResult) {
                    if (selectResult[0].length > 0 && (0, lodash_1.difference)(createIds_1, selectResult[0].map(function (ele) { return ele.destRelationId; })).length === 0) {
                        return true;
                    }
                    if (selectResult[1] && (0, lodash_1.difference)(createIds_1, selectResult[1].map(function (ele) { return ele.relationId; })).length === 0) {
                        return true;
                    }
                };
                if (promises[0] instanceof Promise) {
                    result.push(Promise.all(promises).then(function (r2) {
                        if (checkRelationLegal_1(r2)) {
                            return '';
                        }
                        return "\u60A8\u6CA1\u6709\u521B\u5EFA".concat(createIds_1.join(','), "\u4E4B\u4E00\u5173\u7CFB\u7684\u6743\u9650");
                    }));
                }
                else {
                    if (!checkRelationLegal_1(promises)) {
                        return "\u60A8\u6CA1\u6709\u521B\u5EFA".concat(createIds_1.join(','), "\u5173\u7CFB\u4E4B\u4E00\u7684\u6743\u9650");
                    }
                }
            }
            if (['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity', 'userRelation', 'actionAuth',
                'freeActionAuth', 'relationAuth', 'userEntityGrant', 'relation'].includes(e)) {
                // 只要根对象能检查通过就算通过（暂定这个策略）                
                var r = this.checkSpecialEntity(e, {
                    action: a,
                    data: d,
                    filter: f,
                }, context);
                if (r instanceof Promise) {
                    result.push(r);
                }
            }
            else {
                if (!this.relationalChecker[e]) {
                    throw new types_1.OakUserUnpermittedException("".concat(root.entity, "\u4E0A\u4E0D\u5B58\u5728\u6709\u6548\u7684actionPath"));
                }
                var checker = this.relationalChecker[root.entity](userId, actions || [root.action], root.data, root.filter, userRelations);
                if (typeof checker === 'string') {
                    return checker;
                }
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
                                return "\u5BF9\u300C".concat(missedChild.entity, "\u300D\u8FDB\u884C\u300C").concat(missedChild.action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743");
                            }
                            return '';
                        };
                        if (r2 instanceof Promise) {
                            return r2.then(function (r3) { return checkActionAuth_1(r3); });
                        }
                        return checkActionAuth_1(r2);
                    }
                    else {
                        // 取消directActionAuth，发现root对象能过，则子对象全部自动通过
                        return '';
                    }
                };
                if (r instanceof Promise) {
                    result.push(r.then(function (r2) { return Promise.all(r2.map(function (_a) {
                        var relativePath = _a.relativePath, relationId = _a.relationId;
                        return checkChildrenAuth_1(relativePath, relationId);
                    })); }).then(function (r3) {
                        if (r3.length === 0) {
                            return "\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743");
                        }
                        if (r3.indexOf('') >= 0) {
                            // 有一个过就证明能过
                            return '';
                        }
                        return r3.find(function (ele) { return !!ele; });
                    }));
                }
                else {
                    var r3 = r.map(function (_a) {
                        var relativePath = _a.relativePath, relationId = _a.relationId;
                        return checkChildrenAuth_1(relativePath, relationId);
                    });
                    if (r3.length > 0 && r3.includes('')) {
                        // 有一个过就证明能过
                        return '';
                    }
                    return r3.find(function (ele) { return !!ele; }) || "\u5BF9\u300C".concat(entity, "\u300D\u8FDB\u884C\u300C").concat(action, "\u300D\u64CD\u4F5C\u65F6\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u6388\u6743");
                }
            }
            if (result.length > 0) {
                return Promise.all(result).then(function (r2) {
                    var r3 = r2.find(function (ele) { return !!ele; });
                    if (r3) {
                        return r3;
                    }
                    return '';
                });
            }
        }
        return '';
    };
    /**
     * @param entity
     * @param operation
     * @param context
     * @param actions
     * @returns
     */
    RelationAuth.prototype.checkActions = function (entity, operation, context, actions) {
        var _this = this;
        // 现在checkDeducedAuth和checkSelfAuth是一个或的关系，两者能过一个就算过（message对象就两种可能都有）
        var result = this.tryCheckDeducedAuth(entity, operation, context, actions);
        if (result instanceof Promise) {
            return result.then(function (rt) {
                if (!rt) {
                    return;
                }
                var result2 = _this.tryCheckSelfAuth(entity, operation, context, actions);
                if (result2 instanceof Promise) {
                    return result2.then(function (rt2) {
                        if (!rt2) {
                            return;
                        }
                        throw new types_1.OakUserUnpermittedException(rt2);
                    });
                }
                if (!result2) {
                    return;
                }
                throw new types_1.OakUserUnpermittedException(result2);
            });
        }
        if (!result) {
            return;
        }
        var result2 = this.tryCheckSelfAuth(entity, operation, context, actions);
        if (result2 instanceof Promise) {
            return result2.then(function (rt2) {
                if (!rt2) {
                    return;
                }
                throw new types_1.OakUserUnpermittedException(rt2);
            });
        }
        if (!result2) {
            return;
        }
        throw new types_1.OakUserUnpermittedException(result2);
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
                    var _a = filter, entity = _a.entity, entityId = _a.entityId, relationId_3 = _a.relationId, userId = _a.userId;
                    var destRelations = this.getGrantedRelationIds(entity, entityId, context);
                    if (destRelations instanceof Promise) {
                        return destRelations.then(function (r2) {
                            if (!r2.find(function (ele) { return ele.id === relationId_3; })) {
                                return false;
                            }
                            return true;
                        });
                    }
                    if (!destRelations.find(function (ele) { return ele.id === relationId_3; })) {
                        return false;
                    }
                }
                else {
                    (0, assert_1.default)(action === 'remove');
                    // remove加上限制条件
                    var userId = context.getCurrentUserId();
                    (0, assert_1.default)(filter);
                    var contained = {
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
                    };
                    return (0, filter_1.checkFilterContains)(entity2, context, contained, filter, true);
                }
            }
            case 'user': {
                // 对用户的操作由应用自己去管理权限，这里只检查grant/revoke
                if (['grant', 'revoke'].includes(action)) {
                    (0, assert_1.default)(filter && Object.keys(filter).length === 1, 'grant/revoke只能操作userRelation$user');
                    (0, assert_1.default)(filter.hasOwnProperty('userRelation$user'), 'grant/revoke只能操作userRelation$user');
                    return true;
                }
                else {
                    // 应用允许用户操作其它用户的逻辑请通过编写类型为relation的checker去控制，在这里不能加以限制
                    return true;
                }
            }
            default: {
                (0, assert_1.default)(false, "\u5BF9\u8C61".concat(entity2, "\u7684\u6743\u9650\u63A7\u5236\u6CA1\u6709\u52A0\u4EE5\u63A7\u5236"));
            }
        }
    };
    RelationAuth.prototype.getDeducedEntityFilters = function (entity, filter, actions) {
        var e_4, _a;
        var entityFilters = [
            {
                entity: entity,
                filter: filter,
                actions: actions,
            }
        ];
        if (this.authDeduceRelationMap[entity]) {
            (0, assert_1.default)(this.authDeduceRelationMap[entity] === 'entity');
            var _b = filter, deduceEntity = _b.entity, deduceEntityId = _b.entityId;
            var deduceFilter = {};
            if (deduceEntity && deduceEntityId) {
                deduceFilter = { id: deduceEntityId };
            }
            else {
                // 也可能是用cascade方式进行查找，这里有时候filter上会带有两个不同的entity目标，尚未处理（todo!）
                var ref = this.schema[entity].attributes.entity.ref;
                (0, assert_1.default)(ref instanceof Array);
                try {
                    for (var ref_2 = tslib_1.__values(ref), ref_2_1 = ref_2.next(); !ref_2_1.done; ref_2_1 = ref_2.next()) {
                        var refEntity = ref_2_1.value;
                        if (filter[refEntity]) {
                            deduceEntity = refEntity;
                            deduceFilter = filter[refEntity];
                            break;
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (ref_2_1 && !ref_2_1.done && (_a = ref_2.return)) _a.call(ref_2);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
            if (deduceEntity && deduceFilter) {
                var excludeActions_3 = action_1.readOnlyActions.concat(['create', 'remove']);
                var updateActions = this.schema[deduceEntity].actions.filter(function (a) { return !excludeActions_3.includes(a); });
                var deducedSelections = this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions);
                entityFilters.push.apply(entityFilters, tslib_1.__spreadArray([], tslib_1.__read(deducedSelections), false));
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
                            filter: (0, filter_1.combineFilters)([(_a = {},
                                    _a[foreignKey.slice(foreignKey.length - 2)] = filter,
                                    _a), data[attr].filter || {}]),
                        });
                    }
                    else {
                        if (!_this.authDeduceRelationMap[e]) {
                            hasOneToMany = true;
                            destructInner(e, {
                                data: data[attr].data,
                                filter: (0, filter_1.combineFilters)([(_b = {},
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
        destructInner(entity, selection);
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
        var action = operation2.action, data = operation2.data, filter = operation2.filter;
        var filter2 = action === 'create' ? data || filter : filter;
        (0, assert_1.default)(filter2);
        var addChild = function (node, path, child) {
            var _a;
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
        };
        var destructInner = function (entity, operation, path, child, hasParent) {
            var action = operation.action, data = operation.data, filter = operation.filter;
            var filter2 = action === 'create' ? data || filter : filter;
            (0, assert_1.default)(filter2);
            var me = {
                entity: entity,
                filter: filter2,
                children: {},
                action: action,
            };
            var root = me;
            if (child) {
                (0, assert_1.default)(path);
                addChild(me, path, child);
            }
            var _loop_3 = function (attr) {
                var rel = (0, relation_1.judgeRelation)(_this.schema, entity, attr);
                if (rel === 2) {
                    (0, assert_1.default)(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(attr, data[attr], "".concat(entity, "$entity"), me);
                }
                else if (typeof rel === 'string') {
                    (0, assert_1.default)(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(rel, data[attr], "".concat(entity, "$").concat(attr), me);
                }
                else if (rel instanceof Array) {
                    var _a = tslib_1.__read(rel, 2), e_5 = _a[0], f = _a[1];
                    var otmOperations = data[attr];
                    if (e_5 === 'userRelation' && entity !== 'user') {
                        me.userRelations = [];
                        var dealWithUserRelation_2 = function (userRelation) {
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
                            otmOperations.forEach(function (otmOperation) { return dealWithUserRelation_2(otmOperation); });
                        }
                        else {
                            dealWithUserRelation_2(otmOperations);
                        }
                    }
                    else {
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach(function (otmOperation) {
                                var son = destructInner(e_5, otmOperation, undefined, undefined, true);
                                addChild(me, attr, son);
                            });
                        }
                        else {
                            var son = destructInner(e_5, otmOperations, undefined, undefined, true);
                            addChild(me, attr, son);
                        }
                    }
                }
            };
            for (var attr in data) {
                _loop_3(attr);
            }
            return root;
        };
        return destructInner(entity2, operation2);
    };
    /**
     * 定位到了当前用户所有可能的actionAuth，再用以判定对应的entity是不是满足当前的查询约束
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @return  string代表用户获得授权的relationId，空字符串代表通过userId赋权，false代表失败
     */
    RelationAuth.prototype.checkSingleOperation = function (entity, filter, actionAuths, context, actions) {
        var legalAuths = actionAuths.filter(function (ele) { return ele.destEntity === entity && (0, lodash_1.intersection)(ele.deActions, actions).length > 0; } // 这里只要overlap就可以了
        );
        return legalAuths.map(function (ele) {
            var path = ele.path, relation = ele.relation, relationId = ele.relationId;
            if (relationId) {
                (0, assert_1.default)(relation);
                var userRelations = relation.userRelation$relation;
                if (userRelations.length > 0) {
                    var entityIds = userRelations.map(function (ele) { return ele.entityId; });
                    var contained_1 = {};
                    (0, lodash_1.set)(contained_1, path, {
                        id: {
                            $in: entityIds,
                        }
                    });
                    var contains = (0, filter_1.checkFilterContains)(entity, context, contained_1, filter, true);
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
                    return;
                }
                return;
            }
            // 说明是通过userId关联
            var contained = {};
            (0, lodash_1.set)(contained, "".concat(path, "Id"), context.getCurrentUserId());
            if ((0, filter_1.checkFilterContains)(entity, context, contained, filter, true)) {
                return ele;
            }
            return;
        });
    };
    RelationAuth.prototype.checkSelection = function (entity, selection, context) {
        var _this = this;
        var leafSelections = this.destructSelection(entity, selection);
        var deducedLeafSelections = leafSelections.map(function (_a) {
            var entity = _a.entity, filter = _a.filter;
            return _this.getDeducedEntityFilters(entity, filter, ['select']);
        }).filter(function (ele) {
            var entities = ele.map(function (ele) { return ele.entity; });
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
        if (deducedLeafSelections.length === 0) {
            return true;
        }
        if (!context.getCurrentUserId()) {
            throw new types_1.OakUnloggedInException();
        }
        var allEntities = [];
        deducedLeafSelections.forEach(function (ele) { return ele.forEach(function (_a) {
            var entity = _a.entity;
            allEntities.push(entity);
        }); });
        var actionAuths = context.select('actionAuth', {
            data: {
                id: 1,
                path: 1,
                destEntity: 1,
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
                }
            }
        }, { dontCollect: true });
        /**
         * 返回的结果中，第一层为leafNode，必须全通过，第二层为单个leafNode上的deduce，通过一个就可以，第三层为所有可能的actionAuth，通过一个就可以
         * @param result
         * @returns
         */
        var checkResult = function (result) {
            var r = !result.find(function (ele) {
                var eleFlated = ele.flat();
                return !eleFlated.find(function (ele2) { return !!ele2; });
            });
            return r;
        };
        if (actionAuths instanceof Promise) {
            (0, assert_1.default)(context instanceof AsyncRowStore_1.AsyncContext);
            return actionAuths.then(function (aas) { return Promise.all(deducedLeafSelections.map(function (ele) { return Promise.all(ele.map(function (ele2) { return Promise.all(_this.checkSingleOperation(ele2.entity, ele2.filter, aas, context, ['select'])); })); })).then(function (result) { return checkResult(result); }); });
        }
        return checkResult(deducedLeafSelections.map(function (ele) { return ele.map(function (ele2) { return _this.checkSingleOperation(ele2.entity, ele2.filter, actionAuths, context, ['select']); }); }));
    };
    RelationAuth.prototype.findActionAuthsOnNode = function (node, context) {
        var _this = this;
        var entity = node.entity, filter = node.filter, action = node.action, userRelations = node.userRelations;
        if (RelationAuth.SPECIAL_ENTITIES.includes(entity)) {
            // 特殊对象不用查询
            return [];
        }
        var deducedEntityFilters = this.getDeducedEntityFilters(entity, filter, [action]);
        var allEntities = deducedEntityFilters.map(function (ele) { return ele.entity; });
        // todo 这里其实可以在查询条件里通过userRelation过滤一次，但问题不大
        var actionAuths = context.select('actionAuth', {
            data: {
                id: 1,
                path: 1,
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
                }
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
        var findOwnCreateUserRelation = function (actionAuths) {
            if (userRelations) {
                var ars = actionAuths.filter(function (ar) { return !!userRelations.find(function (ur) { return ur.relationId === ar.relationId; }); });
                if (ars.length > 0) {
                    // 这里能找到actionAuth，其必然是本对象上的授权
                    (0, assert_1.default)(!ars.find(function (ele) { return ele.path !== '' || ele.destEntity !== entity; }));
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
                return Promise.all(deducedEntityFilters.map(function (ele) { return Promise.all(_this.checkSingleOperation(ele.entity, ele.filter, ars, context, ele.actions)); })).then(function (result) { return getActionAuths(result); });
            });
        }
        (0, assert_1.default)(context instanceof SyncRowStore_1.SyncContext);
        var created = findOwnCreateUserRelation(actionAuths);
        if (created) {
            return created;
        }
        return getActionAuths(deducedEntityFilters.map(function (ele) { return _this.checkSingleOperation(ele.entity, ele.filter, actionAuths, context, ele.actions); }));
    };
    RelationAuth.prototype.checkOperationTree = function (tree, context) {
        var _this = this;
        var actionAuths2 = this.findActionAuthsOnNode(tree, context);
        var checkChildNode = function (actionAuths, node) {
            var checkChildNodeInner = function (legalAuths) {
                // 因为如果children是数组的话，会把数组中所有的action并起来查询，所以在这里还要再确认一次
                var realLegalPaths = legalAuths.filter(function (ele) { return ele.destEntity === node.entity && ele.deActions.includes(node.action); });
                var checkChildren = function () {
                    var children = node.children;
                    var childPath = Object.keys(children);
                    if (childPath.length === 0) {
                        return true;
                    }
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
                            var childLegalAuths_1 = realLegalPaths.map(function (ele) {
                                var path = ele.path, relationId = ele.relationId;
                                var path2 = path ? "".concat(pathToParent, ".").concat(path) : pathToParent;
                                return context.select('actionAuth', {
                                    data: {
                                        id: 1,
                                    },
                                    filter: {
                                        path: path2,
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
                            var path = ele.path, relationId = ele.relationId;
                            var path2 = path ? "".concat(pathToParent, ".").concat(path) : pathToParent;
                            return context.select('actionAuth', {
                                data: {
                                    id: 1,
                                },
                                filter: {
                                    path: path2,
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
                        return checkChildren();
                    }
                    return false;
                }
                if (realLegalPaths.length === 0) {
                    if (node === tree) {
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
        var userId = context.getCurrentUserId();
        if (!userId) {
            throw new types_1.OakUnloggedInException();
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
    RelationAuth.SPECIAL_ENTITIES = ['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity', 'userRelation', 'actionAuth', 'relationAuth', 'relation'];
    return RelationAuth;
}());
exports.RelationAuth = RelationAuth;
