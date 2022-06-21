"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalContext = void 0;
class UniversalContext {
    rowStore;
    uuid;
    opRecords;
    scene;
    events;
    constructor(store) {
        this.rowStore = store;
        this.opRecords = [];
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
    async begin(options) {
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
        }
    }
    async commit() {
        if (this.uuid) {
            await this.rowStore.commit(this.uuid);
            this.uuid = undefined;
            for (const e of this.events.commit) {
                await e();
            }
            this.resetEvents();
        }
    }
    async rollback() {
        if (this.uuid) {
            await this.rowStore.rollback(this.uuid);
            this.uuid = undefined;
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
