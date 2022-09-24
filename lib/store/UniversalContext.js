"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var concurrent_1 = require("../utils/concurrent");
var UniversalContext = /** @class */ (function () {
    function UniversalContext(store, headers) {
        this.rowStore = store;
        this.opRecords = [];
        this.rwLock = new concurrent_1.RWLock();
        this.events = {
            commit: [],
            rollback: [],
        };
        if (headers) {
            this.headers = headers;
        }
    }
    UniversalContext.prototype.setHeaders = function (headers) {
        this.headers = headers;
    };
    UniversalContext.prototype.getHeader = function (key) {
        if (this.headers) {
            return this.headers[key];
        }
    };
    UniversalContext.prototype.getScene = function () {
        return this.scene;
    };
    UniversalContext.prototype.setScene = function (scene) {
        this.scene = scene;
    };
    UniversalContext.prototype.resetEvents = function () {
        this.events = {
            commit: [],
            rollback: [],
        };
    };
    UniversalContext.prototype.on = function (event, callback) {
        this.uuid && this.events[event].push(callback);
    };
    /**
     * 一个context中不应该有并发的事务，这里将事务串行化，使用的时候千万要注意不要自己等自己
     * @param options
     */
    UniversalContext.prototype.begin = function (options) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.rwLock.acquire('X')];
                    case 1:
                        _b.sent();
                        if (!!this.uuid) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, this.rowStore.begin(options)];
                    case 2:
                        _a.uuid = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        (0, assert_1.default)(false);
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    UniversalContext.prototype.commit = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, _b, e, e_1_1;
            var e_1, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.uuid) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.rowStore.commit(this.uuid)];
                    case 1:
                        _d.sent();
                        // console.log('commit', this.uuid);
                        this.uuid = undefined;
                        this.rwLock.release();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 7, 8, 9]);
                        _a = tslib_1.__values(this.events.commit), _b = _a.next();
                        _d.label = 3;
                    case 3:
                        if (!!_b.done) return [3 /*break*/, 6];
                        e = _b.value;
                        return [4 /*yield*/, e()];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _b = _a.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 9:
                        this.resetEvents();
                        _d.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    UniversalContext.prototype.rollback = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, _b, e, e_2_1;
            var e_2, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.uuid) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.rowStore.rollback(this.uuid)];
                    case 1:
                        _d.sent();
                        // console.log('rollback', this.uuid);
                        this.uuid = undefined;
                        this.rwLock.release();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 7, 8, 9]);
                        _a = tslib_1.__values(this.events.rollback), _b = _a.next();
                        _d.label = 3;
                    case 3:
                        if (!!_b.done) return [3 /*break*/, 6];
                        e = _b.value;
                        return [4 /*yield*/, e()];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _b = _a.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_2_1 = _d.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 9:
                        this.resetEvents();
                        _d.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    UniversalContext.prototype.getCurrentTxnId = function () {
        return this.uuid;
    };
    return UniversalContext;
}());
exports.UniversalContext = UniversalContext;
