"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncContext = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var SyncContext = /** @class */ (function () {
    function SyncContext(rowStore) {
        this.rowStore = rowStore;
    }
    SyncContext.prototype.begin = function (option) {
        this.uuid = this.rowStore.begin(option);
    };
    SyncContext.prototype.commit = function () {
        (0, assert_1.default)(this.uuid);
        this.rowStore.commit(this.uuid);
        this.uuid = undefined;
    };
    SyncContext.prototype.rollback = function () {
        (0, assert_1.default)(this.uuid);
        this.rowStore.rollback(this.uuid);
        this.uuid = undefined;
    };
    SyncContext.prototype.getCurrentTxnId = function () {
        return this.uuid;
    };
    SyncContext.prototype.getSchema = function () {
        return this.rowStore.getSchema();
    };
    SyncContext.prototype.operate = function (entity, operation, option) {
        return this.rowStore.operate(entity, operation, this, option);
    };
    SyncContext.prototype.select = function (entity, selection, option) {
        return this.rowStore.select(entity, selection, this, option);
    };
    SyncContext.prototype.count = function (entity, selection, option) {
        return this.rowStore.count(entity, selection, this, option);
    };
    return SyncContext;
}());
exports.SyncContext = SyncContext;
;
;
