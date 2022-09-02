"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModiRelatedCheckers = exports.abandonModis = exports.applyModis = exports.createOperationsFromModies = void 0;
var tslib_1 = require("tslib");
var types_1 = require("../types");
var action_1 = require("../actions/action");
var lodash_1 = require("../utils/lodash");
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
function applyModis(filter, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a, _b, _c;
        var _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = context.rowStore).operate;
                    _c = ['modi'];
                    _d = {};
                    return [4 /*yield*/, generateNewId()];
                case 1: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.id = _e.sent(),
                            _d.action = 'apply',
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
                            _d), context, {
                            dontCollect: true,
                            blockTrigger: true,
                        }]))];
            }
        });
    });
}
exports.applyModis = applyModis;
function abandonModis(filter, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a, _b, _c;
        var _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = context.rowStore).operate;
                    _c = ['modi'];
                    _d = {};
                    return [4 /*yield*/, generateNewId()];
                case 1: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.id = _e.sent(),
                            _d.action = 'abadon',
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
                            _d), context, {
                            dontCollect: true,
                            blockTrigger: true,
                        }]))];
            }
        });
    });
}
exports.abandonModis = abandonModis;
function createModiRelatedCheckers(schema) {
    var _this = this;
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
            checker: function (_a, context) {
                var operation = _a.operation;
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var filter, filter2, count;
                    var _b;
                    return tslib_1.__generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                filter = operation.filter;
                                filter2 = {
                                    modi: {
                                        iState: 'active',
                                    },
                                };
                                if (filter) {
                                    Object.assign(filter2, (_b = {},
                                        _b[entity] = filter,
                                        _b));
                                }
                                else {
                                    Object.assign(filter2, {
                                        entity: entity,
                                    });
                                }
                                return [4 /*yield*/, context.rowStore.count('modiEntity', {
                                        filter: filter2,
                                    }, context, {})];
                            case 1:
                                count = _c.sent();
                                if (count > 0) {
                                    throw new types_1.OakRowLockedException();
                                }
                                return [2 /*return*/, 0];
                        }
                    });
                });
            },
        });
    };
    for (var entity in schema) {
        _loop_1(entity);
    }
    return checkers;
}
exports.createModiRelatedCheckers = createModiRelatedCheckers;
