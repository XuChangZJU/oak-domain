
import { EntityDict, RowStore, OperateOption, OperationResult, SelectOption, Context, TxnOption, OpRecord, AggregationResult, ClusterInfo } from "../types";
import { readOnlyActions } from '../actions/action';
import assert from "assert";
import { IncomingHttpHeaders } from "http";

/**
 * 服务器端执行的异步环境的底层抽象
 */
export abstract class AsyncContext<ED extends EntityDict> implements Context {
    rowStore: AsyncRowStore<ED, this>;
    private uuid?: string;
    opRecords: OpRecord<ED>[];
    private scene?: string;
    headers?: IncomingHttpHeaders;
    clusterInfo?: ClusterInfo;
    opResult: OperationResult<ED>;
    private message?: string;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    }

    /**
     * 在返回结果前调用，对数据行进行一些预处理，比如将一些敏感的列隐藏
     */
    abstract refineOpRecords(): Promise<void>;

    constructor(store: AsyncRowStore<ED, AsyncContext<ED>>) {
        this.rowStore = store;
        this.opRecords = [];
        this.events = {
            commit: [],
            rollback: [],
        };
        this.opResult = {};
    }

    // 使一个上下文重新开始事务执行，清除历史数据（定时器中使用）
    async restartToExecute(routine: (context: this) => Promise<any>) {
        const newContext = !this.uuid ? this : {
            ...this,
        };  // 这里可能有问题，继承的context对象中如果有对象属性会变成指针公用，但是估计目前是跑不到的。by Xc 20231215
        if (newContext !== this) {
            console.warn('restartToExecute跑出了非重用当前context的情况，请仔细调试');
        }
        
        newContext.opRecords = [];
        newContext.events = {
            commit: [],
            rollback: [],
        };
        newContext.opResult = {};

        await newContext.begin();
        try {
            await routine(newContext);
            await newContext.commit();
        }
        catch (err) {
            await newContext.rollback();
            throw err;
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
            this.opRecords = [];
            this.opResult = {};
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
            this.opRecords = [];
            this.opResult = {};
            this.resetEvents();
            for (const e of rollbackEvents) {
                await e();
            }
        }
    }

    async operate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        option: OP
    ) {
        const result = await this.rowStore.operate(entity, operation, this, option);
        this.opResult = this.mergeMultipleResults([this.opResult, result]);
        return result;
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