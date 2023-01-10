"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModiRelatedTriggers = exports.createRelationHierarchyCheckers = exports.createModiRelatedCheckers = exports.abandonModis = exports.applyModis = exports.createOperationsFromModies = void 0;
var tslib_1 = require("tslib");
var types_1 = require("../types");
var action_1 = require("../actions/action");
var lodash_1 = require("../utils/lodash");
var uuid_1 = require("../utils/uuid");
var string_1 = require("../utils/string");
function createOperationsFromModies(modies) {
    return modies.map(function (modi) {
        return {
            entity: modi.targetEntity,
            operation: {
                id: modi.id,
                action: modi.action,
                data: modi.data,
                filter: modi.filter,
            }
        };
    });
}
exports.createOperationsFromModies = createOperationsFromModies;
function applyModis(filter, context, option) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a, _b, _c;
        var _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = context).operate;
                    _c = ['modi'];
                    _d = {};
                    return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                case 1: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.id = _e.sent(),
                            _d.action = 'apply',
                            _d.data = {},
                            _d.filter = filter,
                            _d), Object.assign({}, option, {
                            blockTrigger: false,
                        })]))];
            }
        });
    });
}
exports.applyModis = applyModis;
function abandonModis(filter, context, option) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a, _b, _c;
        var _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = context).operate;
                    _c = ['modi'];
                    _d = {};
                    return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                case 1: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.id = _e.sent(),
                            _d.action = 'abandon',
                            _d.data = {},
                            _d.filter = filter,
                            _d.sorter = [
                                {
                                    $attr: {
                                        $$createAt$$: 1,
                                    },
                                    $direction: 'asc',
                                }
                            ],
                            _d), Object.assign({}, option, {
                            blockTrigger: false,
                        })]))];
            }
        });
    });
}
exports.abandonModis = abandonModis;
function createModiRelatedCheckers(schema) {
    var checkers = [];
    var _loop_1 = function (entity) {
        var _a = schema[entity], actionType = _a.actionType, actions = _a.actions, inModi = _a.inModi;
        if (!inModi || ['readOnly', 'appendOnly'].includes(actionType)) {
            return "continue";
        }
        var restActions = (0, lodash_1.difference)(actions, action_1.appendOnlyActions);
        checkers.push({
            entity: entity,
            action: restActions,
            type: 'row',
            filter: function (operation, context, option) {
                if (option.modiParentId && option.modiParentEntity) {
                    // 如果本身也是创建modi就允许通过
                    return {
                        id: {
                            $exists: true,
                        },
                    };
                }
                return {
                    id: {
                        $nin: {
                            entity: 'modiEntity',
                            data: {
                                entityId: 1,
                            },
                            filter: {
                                entity: entity,
                                modi: {
                                    iState: 'active',
                                }
                            },
                        },
                    }
                };
            },
            errMsg: "\u66F4\u65B0\u7684\u5BF9\u8C61".concat(entity, "\u4E0A\u6709\u5C1A\u672A\u7ED3\u675F\u7684modi"),
        });
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return checkers;
}
exports.createModiRelatedCheckers = createModiRelatedCheckers;
function createRelationHierarchyCheckers(schema) {
    var checkers = [];
    var _loop_2 = function (entity) {
        var e_1, _a;
        var relationHierarchy = schema[entity].relationHierarchy;
        if (relationHierarchy) {
            // 先build反向hierarchy的map
            var reverseHierarchy_1 = {};
            for (var r in relationHierarchy) {
                if (!reverseHierarchy_1[r]) {
                    reverseHierarchy_1[r] = [];
                }
                try {
                    for (var _b = (e_1 = void 0, tslib_1.__values(relationHierarchy[r])), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var r2 = _c.value;
                        if (!reverseHierarchy_1[r2]) {
                            reverseHierarchy_1[r2] = [r];
                        }
                        else {
                            reverseHierarchy_1[r2].push(r);
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
            // 对userEntity对象的授权和回收建立checker
            var userEntityName_1 = "user".concat((0, string_1.firstLetterUpperCase)(entity));
            var entityIdAttr_1 = "".concat(entity, "Id");
            checkers.push({
                entity: userEntityName_1,
                action: 'create',
                type: 'expressionRelation',
                expression: function (operation, context) {
                    var _a;
                    var userId = context.getCurrentUserId();
                    var _b = operation, action = _b.action, data = _b.data, filter = _b.filter;
                    var _c = data, relation = _c.relation, _d = entityIdAttr_1, entityId = _c[_d];
                    var legalRelations = reverseHierarchy_1[relation];
                    if (legalRelations.length === 0) {
                        throw new types_1.OakUserUnpermittedException();
                    }
                    return {
                        entity: userEntityName_1,
                        expr: {
                            $gt: [{
                                    '#attr': '$$createAt$$',
                                }, 0]
                        },
                        filter: (_a = {
                                userId: userId
                            },
                            _a[entityIdAttr_1] = entityId,
                            _a.relation = {
                                $in: legalRelations,
                            },
                            _a)
                    };
                },
                errMsg: '越权操作',
            });
            var _loop_3 = function (r) {
                checkers.push({
                    entity: userEntityName_1,
                    action: 'remove',
                    type: 'expressionRelation',
                    expression: function (operation, context) {
                        var _a, _b;
                        var userId = context.getCurrentUserId();
                        var filter = operation.filter;
                        var legalRelations = reverseHierarchy_1[r];
                        if (legalRelations.length === 0) {
                            throw new types_1.OakUserUnpermittedException('越权操作');
                        }
                        return {
                            entity: userEntityName_1,
                            expr: {
                                $gt: [{
                                        '#attr': '$$createAt$$',
                                    }, 0]
                            },
                            filter: (_a = {
                                    userId: userId
                                },
                                _a[entityIdAttr_1] = {
                                    $in: {
                                        entity: userEntityName_1,
                                        data: (_b = {},
                                            _b[entityIdAttr_1] = 1,
                                            _b),
                                        filter: filter,
                                    }
                                },
                                _a.relation = {
                                    $in: legalRelations,
                                },
                                _a)
                        };
                    },
                    errMsg: '越权操作',
                });
            };
            for (var r in reverseHierarchy_1) {
                _loop_3(r);
            }
        }
    };
    for (var entity in schema) {
        _loop_2(entity);
    }
    return checkers;
}
exports.createRelationHierarchyCheckers = createRelationHierarchyCheckers;
function createModiRelatedTriggers(schema) {
    var _this = this;
    var triggers = [];
    var _loop_4 = function (entity) {
        var inModi = schema[entity].inModi;
        if (inModi) {
            // 当关联modi的对象被删除时，对应的modi也删除
            triggers.push({
                name: "\u5F53\u5220\u9664".concat(entity, "\u5BF9\u8C61\u65F6\uFF0C\u5220\u9664\u76F8\u5173\u8054\u8FD8\u6D3B\u8DC3\u7684modi"),
                action: 'remove',
                entity: entity,
                when: 'after',
                fn: function (_a, context, option) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var data, id, _b, _c, _d;
                        var _e;
                        return tslib_1.__generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    data = operation.data;
                                    id = data.id;
                                    _c = (_b = context).operate;
                                    _d = ['modi'];
                                    _e = {};
                                    return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                case 1: return [4 /*yield*/, _c.apply(_b, _d.concat([(_e.id = _f.sent(),
                                            _e.action = 'remove',
                                            _e.data = {},
                                            _e.filter = {
                                                entity: entity,
                                                entityId: id,
                                            },
                                            _e), option]))];
                                case 2:
                                    _f.sent();
                                    return [2 /*return*/, 1];
                            }
                        });
                    });
                },
            });
        }
    };
    for (var entity in schema) {
        _loop_4(entity);
    }
    return triggers;
}
exports.createModiRelatedTriggers = createModiRelatedTriggers;
