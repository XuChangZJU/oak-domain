"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModiRelatedTriggers = exports.createModiRelatedCheckers = exports.abandonModis = exports.applyModis = exports.createOperationsFromModies = void 0;
var tslib_1 = require("tslib");
var action_1 = require("../actions/action");
var lodash_1 = require("../utils/lodash");
var uuid_1 = require("../utils/uuid");
var assert_1 = tslib_1.__importDefault(require("assert"));
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
                /**
                 * 只有一种情况可以通过，即当前是在更新和active的modi所指向同一个父更新对象。
                 * 比如：先申请了一个公司（company），再申请修改公司（companyApplyment），这时所有的active modi都指向此条companyApplyment
                 *      这时：
                 *          1）再申请一条新的修改公司（create companyApplyment），应被拒绝
                 *          2）申请修改原来的companyApplyment(update companyApplyment)，可以通过
                 *          3）在其它路径上对此company对象进行直接的更新，应被拒绝
                 */
                if (option.modiParentEntity) {
                    var _a = option, modiParentEntity = _a.modiParentEntity, modiParentId = _a.modiParentId;
                    (0, assert_1.default)(modiParentEntity);
                    (0, assert_1.default)(modiParentId);
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
                                        $or: [
                                            {
                                                entity: {
                                                    $ne: modiParentEntity,
                                                },
                                            },
                                            {
                                                entityId: {
                                                    $ne: modiParentId,
                                                },
                                            }
                                        ],
                                    },
                                },
                            },
                        }
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
            errMsg: '您请求的更新对象上还有正在申请的更新，请等该更新结束后再试',
        });
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return checkers;
}
exports.createModiRelatedCheckers = createModiRelatedCheckers;
function createModiRelatedTriggers(schema) {
    var _this = this;
    var triggers = [];
    var _loop_2 = function (entity) {
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
        _loop_2(entity);
    }
    return triggers;
}
exports.createModiRelatedTriggers = createModiRelatedTriggers;
