"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalContext = void 0;
class UniversalContext {
    rowStore;
    uuid;
    opRecords;
    events;
    constructor(store) {
        this.rowStore = store;
        this.opRecords = [];
        this.events = {
            commit: [],
            rollback: [],
        };
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
            /**
             * todo 这里应该等到提交成功了再做 by Xc
             */
            for (const e of this.events.commit) {
                await e(this);
            }
            await this.rowStore.commit(this.uuid);
            this.uuid = undefined;
            this.resetEvents();
        }
    }
    async rollback() {
        if (this.uuid) {
            /**
             * todo 这里应该等到回滚成功了再做 by Xc
             */
            for (const e of this.events.rollback) {
                await e(this);
            }
            await this.rowStore.rollback(this.uuid);
            this.uuid = undefined;
            this.resetEvents();
        }
    }
    getCurrentTxnId() {
        return this.uuid;
    }
}
exports.UniversalContext = UniversalContext;
