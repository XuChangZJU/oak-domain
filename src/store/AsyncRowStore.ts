
import { EntityDict, RowStore, OperateOption, OperationResult, SelectOption, Context, TxnOption, OpRecord, AggregationResult } from "../types";
import assert from "assert";
import { IncomingHttpHeaders } from "http";

export abstract class AsyncContext<ED extends EntityDict> implements Context {
    private rowStore: AsyncRowStore<ED, this>;
    private uuid?: string;
    opRecords: OpRecord<ED>[];
    private scene?: string;
    private headers?: IncomingHttpHeaders;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    }

    constructor(store: AsyncRowStore<ED, AsyncContext<ED>>, headers?: IncomingHttpHeaders) {
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
        if (!this.uuid) {
            this.uuid = await this.rowStore.begin(options);
        }
        else {
            assert(false);
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
            // console.log('rollback', this.uuid);
            this.uuid = undefined;
            for(const e of this.events.rollback) {
                await e();
            }
            this.resetEvents();
        }
    }
     
    operate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        option: OP
    ) {
        return this.rowStore.operate(entity, operation, this, option);
    }
    select<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        selection: ED[T]['Selection'],
        option: OP
    ) {
        return this.rowStore.select(entity, selection, this, option);
    }
    count<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter' | 'count'>,
        option: OP
    ) {
        return this.rowStore.count(entity, selection, this, option);
    }

    mergeMultipleResults(toBeMerged: OperationResult<ED>[]) {
        return this.rowStore.mergeMultipleResults(toBeMerged);
    }
    
    getCurrentTxnId() {
        return this.uuid;
    }

    getSchema() {
        return this.rowStore.getSchema();
    }

    abstract isRoot(): boolean;

    abstract getCurrentUserId(allowUnloggedIn?: boolean): string | undefined;
    
    abstract toString(): string;

    abstract allowUserUpdate(): boolean;
};

export interface AsyncRowStore<ED extends EntityDict, Cxt extends Context> extends RowStore<ED> {
    operate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP
    ): Promise<OperationResult<ED>>;

    select<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP
    ): Promise<Partial<ED[T]['Schema']>[]>;

    aggregate<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP
    ): Promise<AggregationResult<ED[T]['Schema']>>;

    count<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter' | 'count'>,
        context: Cxt,
        option: OP
    ): Promise<number>;


    begin(option?: TxnOption): Promise<string>;

    commit(txnId: string): Promise<void>;

    rollback(txnId: string): Promise<void>;
};