"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncContext = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
class AsyncContext {
    rowStore;
    uuid;
    opRecords;
    scene;
    headers;
    message;
    events;
    constructor(store, headers) {
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
    setHeaders(headers) {
        this.headers = headers;
    }
    getHeader(key) {
        if (this.headers) {
            return this.headers[key];
        }
    }
    getScene() {
        return this.scene;
    }
    setScene(scene) {
        this.scene = scene;
    }
    resetEvents() {
        this.events = {
            commit: [],
            rollback: [],
        };
    }
    on(event, callback) {
        this.uuid && this.events[event].push(callback);
    }
    /**
     * 一个context中不应该有并发的事务，这里将事务串行化，使用的时候千万要注意不要自己等自己
     * @param options
     */
    async begin(options) {
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
        }
        else {
            (0, assert_1.default)(false);
        }
    }
    async commit() {
        if (this.uuid) {
            await this.rowStore.commit(this.uuid);
            this.uuid = undefined;
            const { commit: commitEvents } = this.events;
            this.resetEvents();
            for (const e of commitEvents) {
                await e();
            }
        }
    }
    async rollback() {
        if (this.uuid) {
            await this.rowStore.rollback(this.uuid);
            // console.log('rollback', this.uuid);
            this.uuid = undefined;
            const { rollback: rollbackEvents } = this.events;
            this.resetEvents();
            for (const e of rollbackEvents) {
                await e();
            }
        }
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
    exec(script, txnId) {
        return this.rowStore.exec(script, txnId);
    }
    mergeMultipleResults(toBeMerged) {
        return this.rowStore.mergeMultipleResults(toBeMerged);
    }
    getCurrentTxnId() {
        return this.uuid;
    }
    getSchema() {
        return this.rowStore.getSchema();
    }
    setMessage(message) {
        this.message = message;
    }
    getMessage() {
        return this.message;
    }
}
exports.AsyncContext = AsyncContext;
;
;
