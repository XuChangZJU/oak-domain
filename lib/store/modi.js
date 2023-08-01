"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModiRelatedTriggers = exports.createModiRelatedCheckers = exports.abandonModis = exports.applyModis = exports.createOperationsFromModies = void 0;
var tslib_1 = require("tslib");
var types_1 = require("../types");
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
                        modiEntity$entity: {
                            '#sqp': 'not in',
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
                        /* id: {
                            $nin: {
                                entity: 'modiEntity',
                                data: {
                                    entityId: 1,
                                },
                                filter: {
                                    entity,
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
                        } */
                    };
                }
                return {
                    modiEntity$entity: {
                        '#sqp': 'not in',
                        entity: entity,
                        modi: {
                            iState: 'active',
                        }
                    },
                    /* id: {
                        $nin: {
                            entity: 'modiEntity',
                            data: {
                                entityId: 1,
                            },
                            filter: {
                                entity,
                                modi: {
                                    iState: 'active',
                                }
                            },
                        },
                    } */
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
        var toModi = schema[entity].toModi;
        if (toModi) {
            // 当关联modi的对象被删除时，对应的modi也删除。这里似乎只需要删除掉活跃对象？因为oper不能删除，所以oper和modi是必须要支持对deleted对象的容错？
            // 这里没有想清楚，by Xc 20230209
            triggers.push({
                name: "\u5F53\u5220\u9664".concat(entity, "\u5BF9\u8C61\u65F6\uFF0C\u5220\u9664\u76F8\u5173\u8054\u7684modi\u7684modiEntity"),
                action: 'remove',
                entity: entity,
                when: 'before',
                priority: types_1.TRIGGER_DEFAULT_PRIORITY,
                fn: function (_a, context, option) {
                    var operation = _a.operation;
                    return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var filter, _b, _c, _d, _e, _f, _g;
                        var _h, _j, _k, _l;
                        return tslib_1.__generator(this, function (_m) {
                            switch (_m.label) {
                                case 0:
                                    filter = operation.filter;
                                    _c = (_b = context).operate;
                                    _d = ['modiEntity'];
                                    _h = {};
                                    return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                case 1: return [4 /*yield*/, _c.apply(_b, _d.concat([(_h.id = _m.sent(),
                                            _h.action = 'remove',
                                            _h.data = {},
                                            _h.filter = {
                                                modi: (_j = {},
                                                    _j[entity] = filter,
                                                    _j.iState = 'active',
                                                    _j),
                                            },
                                            _h), { dontCollect: true }]))];
                                case 2:
                                    _m.sent();
                                    _f = (_e = context).operate;
                                    _g = ['modi'];
                                    _k = {};
                                    return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                case 3: return [4 /*yield*/, _f.apply(_e, _g.concat([(_k.id = _m.sent(),
                                            _k.action = 'remove',
                                            _k.data = {},
                                            _k.filter = (_l = {},
                                                _l[entity] = filter,
                                                _l.iState = 'active',
                                                _l),
                                            _k), { dontCollect: true }]))];
                                case 4:
                                    _m.sent();
                                    return [2 /*return*/, 0];
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
    // modi被应用时的效用，搬到这里了
    var applyTrigger = {
        name: '当modi被应用时，将相应的operate完成',
        entity: 'modi',
        action: 'apply',
        when: 'after',
        fn: function (_a, context, option) {
            var operation = _a.operation;
            return tslib_1.__awaiter(_this, void 0, void 0, function () {
                var filter, modies, modies_1, modies_1_1, modi, targetEntity, id, action, data, filter_1, e_1_1;
                var e_1, _b;
                return tslib_1.__generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            filter = operation.filter;
                            return [4 /*yield*/, context.select('modi', {
                                    data: {
                                        id: 1,
                                        action: 1,
                                        data: 1,
                                        filter: 1,
                                        targetEntity: 1,
                                    },
                                    filter: filter,
                                    sorter: [
                                        {
                                            $attr: {
                                                $$createAt$$: 1,
                                            },
                                            $direction: 'asc',
                                        },
                                    ],
                                }, option)];
                        case 1:
                            modies = _c.sent();
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 7, 8, 9]);
                            modies_1 = tslib_1.__values(modies), modies_1_1 = modies_1.next();
                            _c.label = 3;
                        case 3:
                            if (!!modies_1_1.done) return [3 /*break*/, 6];
                            modi = modies_1_1.value;
                            targetEntity = modi.targetEntity, id = modi.id, action = modi.action, data = modi.data, filter_1 = modi.filter;
                            return [4 /*yield*/, context.operate(targetEntity, {
                                    id: id,
                                    action: action,
                                    data: data,
                                    filter: filter_1,
                                }, option)];
                        case 4:
                            _c.sent();
                            _c.label = 5;
                        case 5:
                            modies_1_1 = modies_1.next();
                            return [3 /*break*/, 3];
                        case 6: return [3 /*break*/, 9];
                        case 7:
                            e_1_1 = _c.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 9];
                        case 8:
                            try {
                                if (modies_1_1 && !modies_1_1.done && (_b = modies_1.return)) _b.call(modies_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 9: return [2 /*return*/, modies.length];
                    }
                });
            });
        }
    };
    return triggers.concat([applyTrigger]);
}
exports.createModiRelatedTriggers = createModiRelatedTriggers;
