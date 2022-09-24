import assert from 'assert';
import { IncomingHttpHeaders } from 'http';
import { EntityDict, OpRecord, RowStore, TxnOption, Context } from "../types";
import { RWLock } from '../utils/concurrent';

export abstract class UniversalContext<ED extends EntityDict> implements Context<ED> {
    rowStore: RowStore<ED, this>;
    uuid?: string;
    opRecords: OpRecord<ED>[];
    private scene?: string;
    private rwLock: RWLock;
    private headers?: IncomingHttpHeaders;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    }

    constructor(store: RowStore<ED, UniversalContext<ED>>, headers?: IncomingHttpHeaders) {
        this.rowStore = store;
        this.opRecords = [];
        this.rwLock = new RWLock();
        this.events = {
            commit: [],
            rollback: [],
        };
        if (headers) {
            this.headers = headers;
        }
    }

    setHeaders(headers: IncomingHttpHeaders) {
        this.headers = headers;
    }
    
    getHeader(key: string): string | string[] | undefined {
        if (this.headers) {
            return this.headers[key];
        }
    }
    getScene(): string | undefined {
        return this.scene;
    }
    setScene(scene?: string): void {
        this.scene = scene;
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

    /**
     * 一个context中不应该有并发的事务，这里将事务串行化，使用的时候千万要注意不要自己等自己
     * @param options 
     */
    async begin(options?: TxnOption): Promise<void> {
        await this.rwLock.acquire('X');
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
            // console.log('begin', this.uuid);
        }
        else {
            assert(false);
        }
    }
    async commit(): Promise<void> {
        if (this.uuid) {
            await this.rowStore.commit(this.uuid!);
            // console.log('commit', this.uuid);
            this.uuid = undefined;
            this.rwLock.release();
            for(const e of this.events.commit) {
                await e();
            }
            this.resetEvents();
        }
    }
    async rollback(): Promise<void> {
        if(this.uuid) {
            await this.rowStore.rollback(this.uuid!);
            // console.log('rollback', this.uuid);
            this.uuid = undefined;
            this.rwLock.release();
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

    abstract getCurrentUserId(): Promise<string | undefined>;
}