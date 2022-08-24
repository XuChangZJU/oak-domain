"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerExecutor = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var lodash_1 = require("../utils/lodash");
var filter_1 = require("../store/filter");
var Trigger_1 = require("../types/Trigger");
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
/* const UnifiedActionMatrix: Record<string, string> = {
    'create': 'create',
    'remove': 'remove',
    'select': 'select',
    'download': 'select',
    'count': 'select',
    'stat': 'select',
}; */
var TriggerExecutor = /** @class */ (function (_super) {
    tslib_1.__extends(TriggerExecutor, _super);
    function TriggerExecutor(contextBuilder, logger) {
        if (logger === void 0) { logger = console; }
        var _this = _super.call(this) || this;
        _this.contextBuilder = contextBuilder;
        _this.logger = logger;
        _this.triggerMap = {};
        _this.triggerNameMap = {};
        _this.volatileEntities = [];
        _this.counter = 0;
        return _this;
    }
    TriggerExecutor.prototype.registerChecker = function (checker) {
        var entity = checker.entity, action = checker.action, checkFn = checker.checker, type = checker.type;
        var triggerName = "".concat(String(entity)).concat(action, "\u6743\u9650\u68C0\u67E5-").concat(this.counter++);
        var trigger = {
            checkerType: type,
            name: triggerName,
            entity: entity,
            action: action,
            fn: checkFn,
            when: 'before',
        };
        this.registerTrigger(trigger);
    };
    TriggerExecutor.prototype.registerTrigger = function (trigger) {
        var _a;
        var _this = this;
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error("\u4E0D\u53EF\u6709\u540C\u540D\u7684\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D"));
        }
        Object.assign(this.triggerNameMap, (_a = {},
            _a[trigger.name] = trigger,
            _a));
        var addTrigger = function (action) {
            var _a, _b, _c;
            var triggers = _this.triggerMap[trigger.entity] && _this.triggerMap[trigger.entity][action];
            if (triggers) {
                triggers.push(trigger);
            }
            else if (_this.triggerMap[trigger.entity]) {
                Object.assign(_this.triggerMap[trigger.entity], (_a = {},
                    _a[action] = [trigger],
                    _a));
            }
            else {
                Object.assign(_this.triggerMap, (_b = {},
                    _b[trigger.entity] = (_c = {},
                        _c[action] = [trigger],
                        _c),
                    _b));
            }
        };
        if (typeof trigger.action === 'string') {
            addTrigger(trigger.action);
        }
        else {
            trigger.action.forEach(function (ele) { return addTrigger(ele); });
        }
        if (trigger.when === 'commit' && trigger.strict === 'makeSure') {
            if (this.volatileEntities.indexOf(trigger.entity) === -1) {
                this.volatileEntities.push(trigger.entity);
            }
        }
    };
    TriggerExecutor.prototype.unregisterTrigger = function (trigger) {
        var _this = this;
        (0, assert_1.default)(trigger.when !== 'commit' || trigger.strict !== 'makeSure', 'could not remove strict volatile triggers');
        var removeTrigger = function (action) {
            var triggers = _this.triggerMap[trigger.entity] && _this.triggerMap[trigger.entity][action];
            if (triggers) {
                (0, lodash_1.pull)(triggers, trigger);
                (0, lodash_1.unset)(_this.triggerNameMap, trigger.name);
            }
        };
        if (typeof trigger.action === 'string') {
            removeTrigger(trigger.action);
        }
        else {
            trigger.action.forEach(function (ele) { return removeTrigger(ele); });
        }
    };
    TriggerExecutor.prototype.preCommitTrigger = function (entity, operation, trigger, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, filter, filter2, rowStore, count, _b, _c, _d, _e;
            var _f, _g;
            return tslib_1.__generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        (0, assert_1.default)(trigger.action !== 'select');
                        if (!(trigger.strict === 'makeSure')) return [3 /*break*/, 6];
                        _a = operation.action;
                        switch (_a) {
                            case 'create': return [3 /*break*/, 1];
                        }
                        return [3 /*break*/, 2];
                    case 1:
                        {
                            if (operation.data.hasOwnProperty(Trigger_1.Executor.dataAttr) || operation.data.hasOwnProperty(Trigger_1.Executor.timestampAttr)) {
                                throw new Error('同一行数据上不能存在两个跨事务约束');
                            }
                            return [3 /*break*/, 4];
                        }
                        _h.label = 2;
                    case 2:
                        filter = operation.filter;
                        filter2 = (0, filter_1.addFilterSegment)({
                            $or: [
                                {
                                    $$triggerData$$: {
                                        $exists: true,
                                    },
                                },
                                {
                                    $$triggerTimestamp$$: {
                                        $exists: true,
                                    },
                                }
                            ],
                        }, filter);
                        rowStore = context.rowStore;
                        return [4 /*yield*/, rowStore.count(entity, {
                                filter: filter2
                            }, context, {})];
                    case 3:
                        count = _h.sent();
                        if (count > 0) {
                            throw new Error("\u5BF9\u8C61".concat(String(entity), "\u7684\u884C\u300C").concat(JSON.stringify(operation), "\u300D\u4E0A\u5DF2\u7ECF\u5B58\u5728\u672A\u5B8C\u6210\u7684\u8DE8\u4E8B\u52A1\u7EA6\u675F"));
                        }
                        return [3 /*break*/, 4];
                    case 4:
                        _c = (_b = Object).assign;
                        _d = [operation.data];
                        _f = {};
                        _e = Trigger_1.Executor.dataAttr;
                        _g = {
                            name: trigger.name,
                            operation: operation
                        };
                        return [4 /*yield*/, context.toString()];
                    case 5:
                        _c.apply(_b, _d.concat([(_f[_e] = (_g.cxtStr = _h.sent(),
                                _g.params = option,
                                _g),
                                _f[Trigger_1.Executor.timestampAttr] = Date.now(),
                                _f)]));
                        _h.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    TriggerExecutor.prototype.preOperation = function (entity, operation, context, option) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, triggers, preTriggers, preTriggers_1, preTriggers_1_1, trigger, number, e_1_1, commitTriggers, commitTriggers_1, commitTriggers_1_1, trigger, e_2_1;
            var e_1, _b, e_2, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        action = operation.action;
                        triggers = this.triggerMap[entity] && ((_a = this.triggerMap[entity][action]) === null || _a === void 0 ? void 0 : _a.filter(function (trigger) { return typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action); }));
                        if (!triggers) return [3 /*break*/, 16];
                        preTriggers = triggers.filter(function (ele) { return ele.when === 'before' && (!ele.check || ele.check(operation)); });
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, 7, 8]);
                        preTriggers_1 = tslib_1.__values(preTriggers), preTriggers_1_1 = preTriggers_1.next();
                        _d.label = 2;
                    case 2:
                        if (!!preTriggers_1_1.done) return [3 /*break*/, 5];
                        trigger = preTriggers_1_1.value;
                        return [4 /*yield*/, trigger.fn({ operation: operation }, context, option)];
                    case 3:
                        number = _d.sent();
                        if (number > 0) {
                            this.logger.info("\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D\u6210\u529F\u89E6\u53D1\u4E86\u300C").concat(number, "\u300D\u884C\u6570\u636E\u66F4\u6539"));
                        }
                        _d.label = 4;
                    case 4:
                        preTriggers_1_1 = preTriggers_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (preTriggers_1_1 && !preTriggers_1_1.done && (_b = preTriggers_1.return)) _b.call(preTriggers_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 8:
                        commitTriggers = triggers.filter(function (ele) { return ele.when === 'commit' && (!ele.check || ele.check(operation)); });
                        _d.label = 9;
                    case 9:
                        _d.trys.push([9, 14, 15, 16]);
                        commitTriggers_1 = tslib_1.__values(commitTriggers), commitTriggers_1_1 = commitTriggers_1.next();
                        _d.label = 10;
                    case 10:
                        if (!!commitTriggers_1_1.done) return [3 /*break*/, 13];
                        trigger = commitTriggers_1_1.value;
                        return [4 /*yield*/, this.preCommitTrigger(entity, operation, trigger, context, option)];
                    case 11:
                        _d.sent();
                        _d.label = 12;
                    case 12:
                        commitTriggers_1_1 = commitTriggers_1.next();
                        return [3 /*break*/, 10];
                    case 13: return [3 /*break*/, 16];
                    case 14:
                        e_2_1 = _d.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 16];
                    case 15:
                        try {
                            if (commitTriggers_1_1 && !commitTriggers_1_1.done && (_c = commitTriggers_1.return)) _c.call(commitTriggers_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    TriggerExecutor.prototype.onCommit = function (trigger, operation, cxtStr, option) {
        var _this = this;
        return function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var context, number, rowStore, filter;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.contextBuilder(cxtStr)];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.begin()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, trigger.fn({
                                operation: operation,
                            }, context, option)];
                    case 3:
                        number = _a.sent();
                        rowStore = context.rowStore;
                        if (!(trigger.strict === 'makeSure')) return [3 /*break*/, 5];
                        filter = {};
                        if (operation.action === 'create') {
                            filter = operation.data instanceof Array ? {
                                filter: {
                                    id: {
                                        $in: operation.data.map(function (ele) { return ele.id; }),
                                    },
                                },
                            } : {
                                filter: {
                                    id: operation.data.id,
                                }
                            };
                        }
                        else if (operation.filter) {
                            Object.assign(filter, { filter: operation.filter });
                        }
                        return [4 /*yield*/, rowStore.operate(trigger.entity, tslib_1.__assign({ id: 'aaa', action: 'update', data: {
                                    $$triggerTimestamp$$: null,
                                    $$triggerData$$: null,
                                } }, filter /** as Filter<'update', DeduceFilter<ED[T]['Schema']>> */), context, {})];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, context.commit()];
                    case 6:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
    };
    TriggerExecutor.prototype.postCommitTrigger = function (operation, trigger, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e;
            return tslib_1.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _b = (_a = context).on;
                        _c = ['commit'];
                        _d = this.onCommit;
                        _e = [trigger, operation];
                        return [4 /*yield*/, context.toString()];
                    case 1:
                        _b.apply(_a, _c.concat([_d.apply(this, _e.concat([_f.sent(), option]))]));
                        return [2 /*return*/];
                }
            });
        });
    };
    TriggerExecutor.prototype.postOperation = function (entity, operation, context, option, result) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, triggers, postTriggers, postTriggers_1, postTriggers_1_1, trigger, number, e_3_1, commitTriggers, commitTriggers_2, commitTriggers_2_1, trigger, e_4_1;
            var e_3, _b, e_4, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        action = operation.action;
                        triggers = this.triggerMap[entity] && ((_a = this.triggerMap[entity][action]) === null || _a === void 0 ? void 0 : _a.filter(function (trigger) { return typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action); }));
                        if (!triggers) return [3 /*break*/, 16];
                        postTriggers = triggers.filter(function (ele) { return ele.when === 'after' && (!ele.check || ele.check(operation)); });
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, 7, 8]);
                        postTriggers_1 = tslib_1.__values(postTriggers), postTriggers_1_1 = postTriggers_1.next();
                        _d.label = 2;
                    case 2:
                        if (!!postTriggers_1_1.done) return [3 /*break*/, 5];
                        trigger = postTriggers_1_1.value;
                        return [4 /*yield*/, trigger.fn({
                                operation: operation,
                                result: result,
                            }, context, option)];
                    case 3:
                        number = _d.sent();
                        if (number > 0) {
                            this.logger.info("\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D\u6210\u529F\u89E6\u53D1\u4E86\u300C").concat(number, "\u300D\u884C\u6570\u636E\u66F4\u6539"));
                        }
                        _d.label = 4;
                    case 4:
                        postTriggers_1_1 = postTriggers_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_3_1 = _d.sent();
                        e_3 = { error: e_3_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (postTriggers_1_1 && !postTriggers_1_1.done && (_b = postTriggers_1.return)) _b.call(postTriggers_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                        return [7 /*endfinally*/];
                    case 8:
                        commitTriggers = triggers.filter(function (ele) { return ele.when === 'commit' && (!ele.check || ele.check(operation)); });
                        _d.label = 9;
                    case 9:
                        _d.trys.push([9, 14, 15, 16]);
                        commitTriggers_2 = tslib_1.__values(commitTriggers), commitTriggers_2_1 = commitTriggers_2.next();
                        _d.label = 10;
                    case 10:
                        if (!!commitTriggers_2_1.done) return [3 /*break*/, 13];
                        trigger = commitTriggers_2_1.value;
                        return [4 /*yield*/, this.postCommitTrigger(operation, trigger, context, option)];
                    case 11:
                        _d.sent();
                        _d.label = 12;
                    case 12:
                        commitTriggers_2_1 = commitTriggers_2.next();
                        return [3 /*break*/, 10];
                    case 13: return [3 /*break*/, 16];
                    case 14:
                        e_4_1 = _d.sent();
                        e_4 = { error: e_4_1 };
                        return [3 /*break*/, 16];
                    case 15:
                        try {
                            if (commitTriggers_2_1 && !commitTriggers_2_1.done && (_c = commitTriggers_2.return)) _c.call(commitTriggers_2);
                        }
                        finally { if (e_4) throw e_4.error; }
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    TriggerExecutor.prototype.checkpoint = function (context, timestamp) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var result, rowStore, _a, _b, entity, rows, rows_1, rows_1_1, row, $$triggerData$$, _c, name_1, operation, cxtStr, params, trigger, e_5_1, e_6_1;
            var e_6, _d, e_5, _e;
            return tslib_1.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        result = 0;
                        rowStore = context.rowStore;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 13, 14, 15]);
                        _a = tslib_1.__values(this.volatileEntities), _b = _a.next();
                        _f.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 12];
                        entity = _b.value;
                        return [4 /*yield*/, rowStore.select(entity, {
                                data: {
                                    id: 1,
                                    $$triggerData$$: 1,
                                },
                                filter: {
                                    $$triggerTimestamp$$: {
                                        $gt: timestamp,
                                    }
                                },
                            }, context, {
                                dontCollect: true,
                                forUpdate: true,
                            })];
                    case 3:
                        rows = (_f.sent()).result;
                        _f.label = 4;
                    case 4:
                        _f.trys.push([4, 9, 10, 11]);
                        rows_1 = (e_5 = void 0, tslib_1.__values(rows)), rows_1_1 = rows_1.next();
                        _f.label = 5;
                    case 5:
                        if (!!rows_1_1.done) return [3 /*break*/, 8];
                        row = rows_1_1.value;
                        $$triggerData$$ = row.$$triggerData$$;
                        _c = $$triggerData$$, name_1 = _c.name, operation = _c.operation, cxtStr = _c.cxtStr, params = _c.params;
                        trigger = this.triggerNameMap[name_1];
                        return [4 /*yield*/, this.onCommit(trigger, operation, cxtStr, params)()];
                    case 6:
                        _f.sent();
                        _f.label = 7;
                    case 7:
                        rows_1_1 = rows_1.next();
                        return [3 /*break*/, 5];
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        e_5_1 = _f.sent();
                        e_5 = { error: e_5_1 };
                        return [3 /*break*/, 11];
                    case 10:
                        try {
                            if (rows_1_1 && !rows_1_1.done && (_e = rows_1.return)) _e.call(rows_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                        return [7 /*endfinally*/];
                    case 11:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 12: return [3 /*break*/, 15];
                    case 13:
                        e_6_1 = _f.sent();
                        e_6 = { error: e_6_1 };
                        return [3 /*break*/, 15];
                    case 14:
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_6) throw e_6.error; }
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/, result];
                }
            });
        });
    };
    return TriggerExecutor;
}(Trigger_1.Executor));
exports.TriggerExecutor = TriggerExecutor;
