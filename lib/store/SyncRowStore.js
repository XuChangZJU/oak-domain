"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncContext = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
class SyncContext {
    rowStore;
    uuid;
    constructor(rowStore) {
        this.rowStore = rowStore;
    }
    begin(option) {
        (0, assert_1.default)(!this.uuid, '事务不允许嵌套');
        this.uuid = this.rowStore.begin(option);
    }
    commit() {
        (0, assert_1.default)(this.uuid);
        this.rowStore.commit(this.uuid);
        this.uuid = undefined;
    }
    rollback() {
        (0, assert_1.default)(this.uuid);
        this.rowStore.rollback(this.uuid);
        this.uuid = undefined;
    }
    getCurrentTxnId() {
        return this.uuid;
    }
    getSchema() {
        return this.rowStore.getSchema();
    }
    operate(entity, operation, option) {
        return this.rowStore.operate(entity, operation, this, option);
    }
    select(entity, selection, option) {
        return this.rowStore.select(entity, selection, this, option);
    }
    aggregate(entity, aggregation, option) {
        return this.rowStore.aggregate(entity, aggregation, this, option);
    }
    count(entity, selection, option) {
        return this.rowStore.count(entity, selection, this, option);
    }
    mergeMultipleResults(toBeMerged) {
        return this.rowStore.mergeMultipleResults(toBeMerged);
    }
}
exports.SyncContext = SyncContext;
;
;
