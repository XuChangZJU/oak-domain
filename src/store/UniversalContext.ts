import { EntityDict, OpRecord, RowStore, TxnOption, Context } from "../types";

export abstract class UniversalContext<ED extends EntityDict> implements Context<ED> {
    rowStore: RowStore<ED, this>;
    uuid?: string;
    opRecords: OpRecord<ED>[];
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    }

    constructor(store: RowStore<ED, UniversalContext<ED>>) {
        this.rowStore = store;
        this.opRecords = [];       
        this.events = {
            commit: [],
            rollback: [],
        };
    }

    private resetEvents() {        
        this.events = {
            commit: [],
            rollback: [],
        };
    }
    
    on(event: 'commit' | 'rollback', callback: () => Promise<void>): void {
        this.uuid && this.events[event].push(callback);
    }

    async begin(options?: TxnOption): Promise<void> {
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
        }
    }
    async commit(): Promise<void> {
        if (this.uuid) {
            await this.rowStore.commit(this.uuid!);
            this.uuid = undefined;
            for(const e of this.events.commit) {
                await e();
            }
            this.resetEvents();
        }
    }
    async rollback(): Promise<void> {
        if(this.uuid) {
            await this.rowStore.rollback(this.uuid!);
            this.uuid = undefined;
            for(const e of this.events.rollback) {
                await e();
            }
            this.resetEvents();
        }
    }

    getCurrentTxnId() {
        return this.uuid;
    }

    abstract toString(): Promise<string>;
}