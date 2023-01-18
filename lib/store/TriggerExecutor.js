"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerExecutor = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var lodash_1 = require("../utils/lodash");
var filter_1 = require("../store/filter");
var Entity_1 = require("../types/Entity");
var SyncRowStore_1 = require("./SyncRowStore");
var checker_1 = require("./checker");
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
var TriggerExecutor = /** @class */ (function () {
    function TriggerExecutor(contextBuilder, logger) {
        if (logger === void 0) { logger = console; }
        this.contextBuilder = contextBuilder;
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
        this.counter = 0;
    }
    TriggerExecutor.prototype.registerChecker = function (checker) {
        var entity = checker.entity, action = checker.action, type = checker.type, conditionalFilter = checker.conditionalFilter;
        var triggerName = "".concat(String(entity)).concat(action, "\u6743\u9650\u68C0\u67E5-").concat(this.counter++);
        var _a = (0, checker_1.translateCheckerInAsyncContext)(checker), fn = _a.fn, when = _a.when;
        var trigger = {
            checkerType: type,
            name: triggerName,
            priority: checker.priority || 20,
            entity: entity,
            action: action,
            fn: fn,
            when: when,
            filter: conditionalFilter,
        };
        this.registerTrigger(trigger);
    };
    TriggerExecutor.prototype.getCheckers = function (entity, action, checkerTypes) {
        var _a;
        var triggers = this.triggerMap[entity] && ((_a = this.triggerMap[entity][action]) === null || _a === void 0 ? void 0 : _a.filter(function (trigger) { return (typeof trigger.action === 'string' && trigger.action === action || trigger.action instanceof Array && trigger.action.includes(action)
            && (!checkerTypes || trigger.checkerType && checkerTypes.includes(trigger.checkerType))); }));
        return triggers;
    };
    TriggerExecutor.prototype.registerTrigger = function (trigger) {
        var _a;
        var _this = this;
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error("\u4E0D\u53EF\u6709\u540C\u540D\u7684\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D"));
        }
        if (typeof trigger.priority !== 'number') {
            trigger.priority = 10; // 默认值
        }
        if (trigger.filter) {
            (0, assert_1.default)(typeof trigger.action === 'string' && trigger.action !== 'create'
                || trigger.action instanceof Array && !trigger.action.includes('create'), "trigger\u3010".concat(trigger.name, "\u3011\u662Fcreate\u7C7B\u578B\u4F46\u5374\u5E26\u6709filter"));
            (0, assert_1.default)(trigger.when === 'before' || trigger.when === 'commit', "\u5B9A\u4E49\u4E86filter\u7684trigger\u3010".concat(trigger.name, "\u3011\u7684when\u53EA\u80FD\u662Fbefore\u6216\u8005commit"));
        }
        Object.assign(this.triggerNameMap, (_a = {},
            _a[trigger.name] = trigger,
            _a));
        var addTrigger = function (action) {
            var _a, _b, _c;
            var triggers = _this.triggerMap[trigger.entity] && _this.triggerMap[trigger.entity][action];
            if (triggers) {
                var idx = void 0;
                // 这里可以保持有序插入，后面取trigger的时候就不用排序了
                for (idx = 0; idx < triggers.length; idx++) {
                    if (triggers[idx].priority > trigger.priority) {
                        break;
                    }
                }
                triggers.splice(idx, 0, trigger);
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
            var _a, filter, filter2, count;
            var _b;
            return tslib_1.__generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        (0, assert_1.default)(trigger.action !== 'select');
                        if (!(trigger.strict === 'makeSure')) return [3 /*break*/, 5];
                        _a = operation.action;
                        switch (_a) {
                            case 'create': return [3 /*break*/, 1];
                        }
                        return [3 /*break*/, 2];
                    case 1:
                        {
                            if (operation.data.hasOwnProperty(Entity_1.TriggerDataAttribute) || operation.data.hasOwnProperty(Entity_1.TriggerTimestampAttribute)) {
                                throw new Error('同一行数据上不能存在两个跨事务约束');
                            }
                            return [3 /*break*/, 4];
                        }
                        _c.label = 2;
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
                        return [4 /*yield*/, context.count(entity, {
                                filter: filter2
                            }, {})];
                    case 3:
                        count = _c.sent();
                        if (count > 0) {
                            throw new Error("\u5BF9\u8C61".concat(String(entity), "\u7684\u884C\u300C").concat(JSON.stringify(operation), "\u300D\u4E0A\u5DF2\u7ECF\u5B58\u5728\u672A\u5B8C\u6210\u7684\u8DE8\u4E8B\u52A1\u7EA6\u675F"));
                        }
                        return [3 /*break*/, 4];
                    case 4:
                        Object.assign(operation.data, (_b = {},
                            _b[Entity_1.TriggerDataAttribute] = {
                                name: trigger.name,
                                operation: operation,
                                cxtStr: context.toString(),
                                params: option,
                            },
                            _b[Entity_1.TriggerTimestampAttribute] = Date.now(),
                            _b));
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    TriggerExecutor.prototype.preOperation = function (entity, operation, context, option) {
        var e_1, _a;
        var _this = this;
        var _b;
        var action = operation.action;
        var triggers = this.triggerMap[entity] && ((_b = this.triggerMap[entity][action]) === null || _b === void 0 ? void 0 : _b.filter(function (trigger) { return typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action); }));
        if (triggers) {
            var preTriggers_2 = triggers.filter(function (ele) { return ele.when === 'before' && (!ele.check || ele.check(operation)); });
            var commitTriggers_1 = triggers.filter(function (ele) { return ele.when === 'commit' && (!ele.check || ele.check(operation)); });
            if (context instanceof SyncRowStore_1.SyncContext) {
                try {
                    for (var preTriggers_1 = tslib_1.__values(preTriggers_2), preTriggers_1_1 = preTriggers_1.next(); !preTriggers_1_1.done; preTriggers_1_1 = preTriggers_1.next()) {
                        var trigger = preTriggers_1_1.value;
                        if (trigger.filter) {
                            // trigger只对满足条件的前项进行判断，如果确定不满足可以pass
                            (0, assert_1.default)(operation.action !== 'create');
                            var filter = trigger.filter;
                            var filterr = typeof filter === 'function' ? filter(operation, context, option) : filter;
                            (0, assert_1.default)(!(filterr instanceof Promise));
                            var filterRepelled = (0, filter_1.checkFilterRepel)(entity, context, filterr, operation.filter);
                            if (filterRepelled) {
                                continue;
                            }
                        }
                        var number = trigger.fn({ operation: operation }, context, option);
                        if (number > 0) {
                            this.logger.info("\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D\u6210\u529F\u89E6\u53D1\u4E86\u300C").concat(number, "\u300D\u884C\u6570\u636E\u66F4\u6539"));
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (preTriggers_1_1 && !preTriggers_1_1.done && (_a = preTriggers_1.return)) _a.call(preTriggers_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                (0, assert_1.default)(commitTriggers_1.length === 0, "\u524D\u53F0\u4E0D\u5E94\u6709commitTrigger");
            }
            else {
                // 异步context
                var execPreTrigger_1 = function (idx) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var trigger, filter, filterr, _a, filterRepelled, number;
                    return tslib_1.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (idx >= preTriggers_2.length) {
                                    return [2 /*return*/];
                                }
                                trigger = preTriggers_2[idx];
                                if (!trigger.filter) return [3 /*break*/, 5];
                                (0, assert_1.default)(operation.action !== 'create');
                                filter = trigger.filter;
                                if (!(typeof filter === 'function')) return [3 /*break*/, 2];
                                return [4 /*yield*/, filter(operation, context, option)];
                            case 1:
                                _a = _b.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                _a = filter;
                                _b.label = 3;
                            case 3:
                                filterr = _a;
                                return [4 /*yield*/, (0, filter_1.checkFilterRepel)(entity, context, filterr, operation.filter)];
                            case 4:
                                filterRepelled = _b.sent();
                                if (filterRepelled) {
                                    return [2 /*return*/, execPreTrigger_1(idx + 1)];
                                }
                                _b.label = 5;
                            case 5: return [4 /*yield*/, trigger.fn({ operation: operation }, context, option)];
                            case 6:
                                number = _b.sent();
                                if (number > 0) {
                                    this.logger.info("\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D\u6210\u529F\u89E6\u53D1\u4E86\u300C").concat(number, "\u300D\u884C\u6570\u636E\u66F4\u6539"));
                                }
                                return [2 /*return*/, execPreTrigger_1(idx + 1)];
                        }
                    });
                }); };
                var execCommitTrigger_1 = function (idx) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var trigger, filter, filterr, _a, filterRepelled;
                    return tslib_1.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (idx >= commitTriggers_1.length) {
                                    return [2 /*return*/];
                                }
                                trigger = commitTriggers_1[idx];
                                if (!trigger.filter) return [3 /*break*/, 5];
                                (0, assert_1.default)(operation.action !== 'create');
                                filter = trigger.filter;
                                if (!(typeof filter === 'function')) return [3 /*break*/, 2];
                                return [4 /*yield*/, filter(operation, context, option)];
                            case 1:
                                _a = _b.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                _a = filter;
                                _b.label = 3;
                            case 3:
                                filterr = _a;
                                return [4 /*yield*/, (0, filter_1.checkFilterRepel)(entity, context, filterr, operation.filter)];
                            case 4:
                                filterRepelled = _b.sent();
                                if (filterRepelled) {
                                    return [2 /*return*/, execCommitTrigger_1(idx + 1)];
                                }
                                _b.label = 5;
                            case 5: return [4 /*yield*/, this.preCommitTrigger(entity, operation, trigger, context, option)];
                            case 6:
                                _b.sent();
                                return [2 /*return*/, execCommitTrigger_1(idx + 1)];
                        }
                    });
                }); };
                return execPreTrigger_1(0)
                    .then(function () { return execCommitTrigger_1(0); });
            }
        }
    };
    TriggerExecutor.prototype.onCommit = function (trigger, operation, context, option) {
        var _this = this;
        return function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var number, filter;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context.begin()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, trigger.fn({
                                operation: operation,
                            }, context, option)];
                    case 2:
                        number = _a.sent();
                        if (!(trigger.strict === 'makeSure')) return [3 /*break*/, 4];
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
                        return [4 /*yield*/, context.operate(trigger.entity, tslib_1.__assign({ id: 'aaa', action: 'update', data: {
                                    $$triggerTimestamp$$: null,
                                    $$triggerData$$: null,
                                } }, filter /** as Filter<'update', DeduceFilter<ED[T]['Schema']>> */), {})];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, context.commit()];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
    };
    TriggerExecutor.prototype.postCommitTrigger = function (operation, trigger, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                context.on('commit', this.onCommit(trigger, operation, context, option));
                return [2 /*return*/];
            });
        });
    };
    TriggerExecutor.prototype.postOperation = function (entity, operation, context, option, result) {
        var e_2, _a;
        var _this = this;
        var _b;
        var action = operation.action;
        var triggers = this.triggerMap[entity] && ((_b = this.triggerMap[entity][action]) === null || _b === void 0 ? void 0 : _b.filter(function (trigger) { return typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action); }));
        if (triggers) {
            var postTriggers_2 = triggers.filter(function (ele) { return ele.when === 'after' && (!ele.check || ele.check(operation)); });
            var commitTriggers_2 = triggers.filter(function (ele) { return ele.when === 'commit' && (!ele.check || ele.check(operation)); });
            if (context instanceof SyncRowStore_1.SyncContext) {
                try {
                    for (var postTriggers_1 = tslib_1.__values(postTriggers_2), postTriggers_1_1 = postTriggers_1.next(); !postTriggers_1_1.done; postTriggers_1_1 = postTriggers_1.next()) {
                        var trigger = postTriggers_1_1.value;
                        var number = trigger.fn({
                            operation: operation,
                            result: result,
                        }, context, option);
                        if (number > 0) {
                            this.logger.info("\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D\u6210\u529F\u89E6\u53D1\u4E86\u300C").concat(number, "\u300D\u884C\u6570\u636E\u66F4\u6539"));
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (postTriggers_1_1 && !postTriggers_1_1.done && (_a = postTriggers_1.return)) _a.call(postTriggers_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                (0, assert_1.default)(commitTriggers_2.length === 0, '前台目前应当没有commitTrigger');
            }
            else {
                // 异步context
                var execPostTrigger_1 = function (idx) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var trigger, number;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (idx >= postTriggers_2.length) {
                                    return [2 /*return*/];
                                }
                                trigger = postTriggers_2[idx];
                                return [4 /*yield*/, trigger.fn({
                                        operation: operation,
                                        result: result,
                                    }, context, option)];
                            case 1:
                                number = _a.sent();
                                if (number > 0) {
                                    this.logger.info("\u89E6\u53D1\u5668\u300C".concat(trigger.name, "\u300D\u6210\u529F\u89E6\u53D1\u4E86\u300C").concat(number, "\u300D\u884C\u6570\u636E\u66F4\u6539"));
                                }
                                return [2 /*return*/, execPostTrigger_1(idx + 1)];
                        }
                    });
                }); };
                var execCommitTrigger_2 = function (idx) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var trigger;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (idx >= commitTriggers_2.length) {
                                    return [2 /*return*/];
                                }
                                trigger = commitTriggers_2[idx];
                                return [4 /*yield*/, this.postCommitTrigger(operation, trigger, context, option)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/, execCommitTrigger_2(idx + 1)];
                        }
                    });
                }); };
                return execPostTrigger_1(0)
                    .then(function () { return execCommitTrigger_2(0); });
            }
        }
    };
    TriggerExecutor.prototype.checkpoint = function (context, timestamp) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var result, _a, _b, entity, rows, rows_1, rows_1_1, row, $$triggerData$$, _c, name_1, operation, cxtStr, params, trigger, context_1, e_3_1, e_4_1;
            var e_4, _d, e_3, _e;
            return tslib_1.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        result = 0;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 14, 15, 16]);
                        _a = tslib_1.__values(this.volatileEntities), _b = _a.next();
                        _f.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 13];
                        entity = _b.value;
                        return [4 /*yield*/, context.select(entity, {
                                data: {
                                    id: 1,
                                    $$triggerData$$: 1,
                                },
                                filter: {
                                    $$triggerTimestamp$$: {
                                        $gt: timestamp,
                                    }
                                },
                            }, {
                                dontCollect: true,
                                forUpdate: true,
                            })];
                    case 3:
                        rows = _f.sent();
                        _f.label = 4;
                    case 4:
                        _f.trys.push([4, 10, 11, 12]);
                        rows_1 = (e_3 = void 0, tslib_1.__values(rows)), rows_1_1 = rows_1.next();
                        _f.label = 5;
                    case 5:
                        if (!!rows_1_1.done) return [3 /*break*/, 9];
                        row = rows_1_1.value;
                        $$triggerData$$ = row.$$triggerData$$;
                        _c = $$triggerData$$, name_1 = _c.name, operation = _c.operation, cxtStr = _c.cxtStr, params = _c.params;
                        trigger = this.triggerNameMap[name_1];
                        return [4 /*yield*/, this.contextBuilder(cxtStr)];
                    case 6:
                        context_1 = _f.sent();
                        return [4 /*yield*/, this.onCommit(trigger, operation, context_1, params)()];
                    case 7:
                        _f.sent();
                        _f.label = 8;
                    case 8:
                        rows_1_1 = rows_1.next();
                        return [3 /*break*/, 5];
                    case 9: return [3 /*break*/, 12];
                    case 10:
                        e_3_1 = _f.sent();
                        e_3 = { error: e_3_1 };
                        return [3 /*break*/, 12];
                    case 11:
                        try {
                            if (rows_1_1 && !rows_1_1.done && (_e = rows_1.return)) _e.call(rows_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                        return [7 /*endfinally*/];
                    case 12:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 13: return [3 /*break*/, 16];
                    case 14:
                        e_4_1 = _f.sent();
                        e_4 = { error: e_4_1 };
                        return [3 /*break*/, 16];
                    case 15:
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_4) throw e_4.error; }
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/, result];
                }
            });
        });
    };
    return TriggerExecutor;
}());
exports.TriggerExecutor = TriggerExecutor;
