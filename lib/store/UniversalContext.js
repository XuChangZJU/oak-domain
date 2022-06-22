"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalContext = void 0;
const assert_1 = __importDefault(require("assert"));
const concurrent_1 = require("../utils/concurrent");
class UniversalContext {
    rowStore;
    uuid;
    opRecords;
    scene;
    rwLock;
    events;
    constructor(store) {
        this.rowStore = store;
        this.opRecords = [];
        this.rwLock = new concurrent_1.RWLock();
        this.events = {
            commit: [],
            rollback: [],
        };
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
        await this.rwLock.acquire('X');
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
            // console.log('begin', this.uuid);
        }
        else {
            (0, assert_1.default)(false);
        }
    }
    async commit() {
        if (this.uuid) {
            await this.rowStore.commit(this.uuid);
            // console.log('commit', this.uuid);
            this.uuid = undefined;
            this.rwLock.release();
            for (const e of this.events.commit) {
                await e();
            }
            this.resetEvents();
        }
    }
    async rollback() {
        if (this.uuid) {
            await this.rowStore.rollback(this.uuid);
            // console.log('rollback', this.uuid);
            this.uuid = undefined;
            this.rwLock.release();
            for (const e of this.events.rollback) {
                await e();
            }
            this.resetEvents();
        }
    }
    getCurrentTxnId() {
        return this.uuid;
    }
}
exports.UniversalContext = UniversalContext;
