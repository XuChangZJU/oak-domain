
import { EntityDict, RowStore, OperateOption, OperationResult, SelectOption, Context, TxnOption, OpRecord, AggregationResult, ClusterInfo } from "../types";
import { readOnlyActions } from '../actions/action';
import assert from "assert";
import { IncomingHttpHeaders } from "http";

export abstract class AsyncContext<ED extends EntityDict> implements Context {
    rowStore: AsyncRowStore<ED, this>;
    private uuid?: string;
    opRecords: OpRecord<ED>[];
    private scene?: string;
    headers?: IncomingHttpHeaders;
    clusterInfo?: ClusterInfo;
    private message?: string;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    }

    /**
     * 在返回结果前调用，对数据行进行一些预处理，比如将一些敏感的列隐藏
     */
    abstract refineOpRecords(): Promise<void>;

    constructor(store: AsyncRowStore<ED, AsyncContext<ED>>, headers?: IncomingHttpHeaders, clusterInfo?: ClusterInfo) {
        this.rowStore = store;
        this.clusterInfo = clusterInfo;
        this.opRecords = [];
        this.events = {
            commit: [],
            rollback: [],
        };
        if (headers) {
            this.headers = headers;
        }
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

    saveOpRecord<T extends keyof ED>(entity: T, operation: ED[T]['Operation']) {
        const { action, data, filter, id } = operation;
        switch (action) {
            case 'create': {
                this.opRecords.push({
                    id,
                    a: 'c',
                    e: entity,
                    d: data as ED[T]['OpSchema']
                });
                break;
            }
            case 'remove': {
                this.opRecords.push({
                    id,
                    a: 'r',
                    e: entity,
                    f: filter,
                });
                break;
            }
            default: {
                assert(!readOnlyActions.includes(action));
                this.opRecords.push({
                    id,
                    a: 'u',
                    e: entity,
                    d: data as ED[T]['Update']['data'],
                    f: filter,
                });
            }
        }
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
            const { commit: commitEvents } = this.events;
            this.resetEvents();
            for (const e of commitEvents) {
                await e();
            }
        }
    }
    async rollback(): Promise<void> {
        if (this.uuid) {
            await this.rowStore.rollback(this.uuid!);
            // console.log('rollback', this.uuid);
            this.uuid = undefined;
            const { rollback: rollbackEvents } = this.events;
            this.resetEvents();
            for (const e of rollbackEvents) {
                await e();
            }
        }
    }

    operate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        option: OP
    ) {
        return this.rowStore.operate(entity, operation, this, option);
    }
    select<T extends keyof ED, OP extends SelectOption>(
        entity: T,
        selection: ED[T]['Selection'],
        option: OP
    ) {
        return this.rowStore.select(entity, selection, this, option);
    }
    aggregate<T extends keyof ED, OP extends SelectOption>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        option: OP
    ) {
        return this.rowStore.aggregate(entity, aggregation, this, option);
    }
    count<T extends keyof ED, OP extends SelectOption>(
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter' | 'count'>,
        option: OP
    ) {
        return this.rowStore.count(entity, selection, this, option);
    }

    exec(script: string, txnId?: string) {
        return this.rowStore.exec(script, txnId);
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

    setMessage(message: string) {
        this.message = message;
    }

    getMessage() {
        return this.message;
    }

    abstract isRoot(): boolean;

    abstract getCurrentUserId(allowUnloggedIn?: boolean): string | undefined;

    // 此接口将上下文变成可以serialized的字符串
    abstract toString(): string;

    // 此接口将字符串parse成对象再进行初始化
    abstract initialize(data: any): Promise<void>;

    abstract allowUserUpdate(): boolean;

    abstract openRootMode(): () => void;
};

export interface AsyncRowStore<ED extends EntityDict, Cxt extends AsyncContext<ED>> extends RowStore<ED> {
    operate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP
    ): Promise<OperationResult<ED>>;

    select<T extends keyof ED, OP extends SelectOption>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP
    ): Promise<Partial<ED[T]['Schema']>[]>;

    aggregate<T extends keyof ED, OP extends SelectOption>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP
    ): Promise<AggregationResult<ED[T]['Schema']>>;

    count<T extends keyof ED, OP extends SelectOption>(
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter' | 'count'>,
        context: Cxt,
        option: OP
    ): Promise<number>;


    begin(option?: TxnOption): Promise<string>;

    commit(txnId: string): Promise<void>;

    rollback(txnId: string): Promise<void>;

    exec(script: string, txnId?: string): Promise<void>;
};