import assert from 'assert';
import { EntityDict, RowStore, OperateOption, OperationResult, SelectOption, TxnOption, Context, AggregationResult } from "../types";

export abstract class SyncContext<ED extends EntityDict> implements Context {
    rowStore: SyncRowStore<ED, this>;
    private uuid?: string;
    constructor(rowStore: SyncRowStore<ED, SyncContext<ED>>) {
        this.rowStore = rowStore;
    }

    abstract getCurrentUserId(allowUnloggedIn?: boolean): string | undefined;
    abstract isRoot(): boolean;
    abstract toString(): string;
    
    begin(option?: TxnOption) {
        assert(!this.uuid, '事务不允许嵌套');
        this.uuid = this.rowStore.begin(option);
    }
    commit() {
        assert(this.uuid);
        this.rowStore.commit(this.uuid);
        this.uuid = undefined;
    }
    rollback() {
        assert(this.uuid);
        this.rowStore.rollback(this.uuid);
        this.uuid = undefined;
    }
    getCurrentTxnId(): string | undefined {
        return this.uuid;
    }   
    getSchema() {
        return this.rowStore.getSchema();
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
    aggregate<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        aggregation: ED[T]['Aggregation'],
        option: OP
    ) {
        return this.rowStore.aggregate(entity, aggregation, this, option);
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

    abstract allowUserUpdate(): boolean;
};


export interface SyncRowStore<ED extends EntityDict, Cxt extends Context> extends RowStore<ED> {
    // store实现CRUD动作的统一入口定义
    operate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP
    ): OperationResult<ED>;

    select<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP
    ): Partial<ED[T]['Schema']>[];

    count<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter' | 'count'>,
        context: Cxt,
        option: OP
    ): number;

    aggregate<T extends keyof ED, OP extends SelectOption> (
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP
    ): AggregationResult<ED[T]['Schema']>;


    begin(option?: TxnOption): string;

    commit(txnId: string): void;

    rollback(txnId: string): void;
};
