import { EntityDict, OpRecord, RowStore, TxnOption, Context } from "../types";

export class UniversalContext<ED extends EntityDict> implements Context<ED> {
    rowStore: RowStore<ED>;
    uuid?: string;
    opRecords: OpRecord<ED>[];
    events: {
        commit: Array<(context: UniversalContext<ED>) => Promise<void>>;
        rollback: Array<(context: UniversalContext<ED>) => Promise<void>>;
    }

    constructor(store: RowStore<ED>) {
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
    
    on(event: 'commit' | 'rollback', callback: (context: UniversalContext<ED>) => Promise<void>): void {
        this.uuid && this.events[event].push(callback);
    }

    async begin(options?: TxnOption): Promise<void> {
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
        }
    }
    async commit(): Promise<void> {
        if (this.uuid) {
            /**
             * todo 这里应该等到提交成功了再做 by Xc 
             */
            for(const e of this.events.commit) {
                await e(this);
            }
            await this.rowStore.commit(this.uuid!);
            this.uuid = undefined;
            this.resetEvents();
        }
    }
    async rollback(): Promise<void> {
        if(this.uuid) {
            /**
             * todo 这里应该等到回滚成功了再做 by Xc 
             */
            for(const e of this.events.rollback) {
                await e(this);
            }
            await this.rowStore.rollback(this.uuid!);
            this.uuid = undefined;
            this.resetEvents();
        }
    }

    getCurrentTxnId() {
        return this.uuid;
    }
}