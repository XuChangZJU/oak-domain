"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var AsyncContext = /** @class */ (function () {
    function AsyncContext(store, headers) {
        this.rowStore = store;
        this.opRecords = [];
        this.events = {
            commit: [],
            rollback: [],
        };
        if (headers) {
            this.headers = headers;
        }
    }
    AsyncContext.prototype.setHeaders = function (headers) {
        this.headers = headers;
    };
    AsyncContext.prototype.getHeader = function (key) {
        if (this.headers) {
            return this.headers[key];
        }
    };
    AsyncContext.prototype.getScene = function () {
        return this.scene;
    };
    AsyncContext.prototype.setScene = function (scene) {
        this.scene = scene;
    };
    AsyncContext.prototype.resetEvents = function () {
        this.events = {
            commit: [],
            rollback: [],
        };
    };
    AsyncContext.prototype.on = function (event, callback) {
        this.uuid && this.events[event].push(callback);
    };
    /**
     * 一个context中不应该有并发的事务，这里将事务串行化，使用的时候千万要注意不要自己等自己
     * @param options
     */
    AsyncContext.prototype.begin = function (options) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.uuid) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, this.rowStore.begin(options)];
                    case 1:
                        _a.uuid = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        (0, assert_1.default)(false);
                        _b.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AsyncContext.prototype.commit = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var commitEvents, commitEvents_1, commitEvents_1_1, e, e_1_1;
            var e_1, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.uuid) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.rowStore.commit(this.uuid)];
                    case 1:
                        _b.sent();
                        this.uuid = undefined;
                        commitEvents = this.events.commit;
                        this.resetEvents();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, 8, 9]);
                        commitEvents_1 = tslib_1.__values(commitEvents), commitEvents_1_1 = commitEvents_1.next();
                        _b.label = 3;
                    case 3:
                        if (!!commitEvents_1_1.done) return [3 /*break*/, 6];
                        e = commitEvents_1_1.value;
                        return [4 /*yield*/, e()];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        commitEvents_1_1 = commitEvents_1.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (commitEvents_1_1 && !commitEvents_1_1.done && (_a = commitEvents_1.return)) _a.call(commitEvents_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    AsyncContext.prototype.rollback = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var rollbackEvents, rollbackEvents_1, rollbackEvents_1_1, e, e_2_1;
            var e_2, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.uuid) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.rowStore.rollback(this.uuid)];
                    case 1:
                        _b.sent();
                        // console.log('rollback', this.uuid);
                        this.uuid = undefined;
                        rollbackEvents = this.events.rollback;
                        this.resetEvents();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, 8, 9]);
                        rollbackEvents_1 = tslib_1.__values(rollbackEvents), rollbackEvents_1_1 = rollbackEvents_1.next();
                        _b.label = 3;
                    case 3:
                        if (!!rollbackEvents_1_1.done) return [3 /*break*/, 6];
                        e = rollbackEvents_1_1.value;
                        return [4 /*yield*/, e()];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        rollbackEvents_1_1 = rollbackEvents_1.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_2_1 = _b.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (rollbackEvents_1_1 && !rollbackEvents_1_1.done && (_a = rollbackEvents_1.return)) _a.call(rollbackEvents_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    AsyncContext.prototype.operate = function (entity, operation, option) {
        return this.rowStore.operate(entity, operation, this, option);
    };
    AsyncContext.prototype.select = function (entity, selection, option) {
        return this.rowStore.select(entity, selection, this, option);
    };
    AsyncContext.prototype.aggregate = function (entity, aggregation, option) {
        return this.rowStore.aggregate(entity, aggregation, this, option);
    };
    AsyncContext.prototype.count = function (entity, selection, option) {
        return this.rowStore.count(entity, selection, this, option);
    };
    AsyncContext.prototype.exec = function (script, txnId) {
        return this.rowStore.exec(script, txnId);
    };
    AsyncContext.prototype.mergeMultipleResults = function (toBeMerged) {
        return this.rowStore.mergeMultipleResults(toBeMerged);
    };
    AsyncContext.prototype.getCurrentTxnId = function () {
        return this.uuid;
    };
    AsyncContext.prototype.getSchema = function () {
        return this.rowStore.getSchema();
    };
    AsyncContext.prototype.setMessage = function (message) {
        this.message = message;
    };
    AsyncContext.prototype.getMessage = function () {
        return this.message;
    };
    return AsyncContext;
}());
exports.AsyncContext = AsyncContext;
;
;
