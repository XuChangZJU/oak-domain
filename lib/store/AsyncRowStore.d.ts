/// <reference types="node" />
import { EntityDict, RowStore, OperateOption, OperationResult, SelectOption, Context, TxnOption, OpRecord, AggregationResult, ClusterInfo } from "../types";
import { IncomingHttpHeaders } from "http";
export declare abstract class AsyncContext<ED extends EntityDict> implements Context {
    rowStore: AsyncRowStore<ED, this>;
    clusterInfo?: ClusterInfo;
    private uuid?;
    opRecords: OpRecord<ED>[];
    private scene?;
    private headers?;
    private message?;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    };
    /**
     * 在返回结果前调用，对数据行进行一些预处理，比如将一些敏感的列隐藏
     */
    abstract refineOpRecords(): Promise<void>;
    constructor(store: AsyncRowStore<ED, AsyncContext<ED>>, headers?: IncomingHttpHeaders, clusterInfo?: ClusterInfo);
    setHeaders(headers: IncomingHttpHeaders): void;
    getHeader(key: string): string | string[] | undefined;
    getScene(): string | undefined;
    setScene(scene?: string): void;
    private resetEvents;
    on(event: 'commit' | 'rollback', callback: () => Promise<void>): void;
    /**
     * 一个context中不应该有并发的事务，这里将事务串行化，使用的时候千万要注意不要自己等自己
     * @param options
     */
    begin(options?: TxnOption): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    operate<T extends keyof ED, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], option: OP): Promise<OperationResult<ED>>;
    select<T extends keyof ED, OP extends SelectOption>(entity: T, selection: ED[T]['Selection'], option: OP): Promise<Partial<ED[T]["Schema"]>[]>;
    aggregate<T extends keyof ED, OP extends SelectOption>(entity: T, aggregation: ED[T]['Aggregation'], option: OP): Promise<AggregationResult<ED[T]["Schema"]>>;
    count<T extends keyof ED, OP extends SelectOption>(entity: T, selection: Pick<ED[T]['Selection'], 'filter' | 'count'>, option: OP): Promise<number>;
    exec(script: string, txnId?: string): Promise<void>;
    mergeMultipleResults(toBeMerged: OperationResult<ED>[]): OperationResult<ED>;
    getCurrentTxnId(): string | undefined;
    getSchema(): import("../types").StorageSchema<ED>;
    setMessage(message: string): void;
    getMessage(): string | undefined;
    abstract isRoot(): boolean;
    abstract getCurrentUserId(allowUnloggedIn?: boolean): string | undefined;
    abstract toString(): string;
    abstract initialize(data: any): Promise<void>;
    abstract allowUserUpdate(): boolean;
    abstract openRootMode(): () => void;
}
export interface AsyncRowStore<ED extends EntityDict, Cxt extends AsyncContext<ED>> extends RowStore<ED> {
    operate<T extends keyof ED, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): Promise<OperationResult<ED>>;
    select<T extends keyof ED, OP extends SelectOption>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Promise<Partial<ED[T]['Schema']>[]>;
    aggregate<T extends keyof ED, OP extends SelectOption>(entity: T, aggregation: ED[T]['Aggregation'], context: Cxt, option: OP): Promise<AggregationResult<ED[T]['Schema']>>;
    count<T extends keyof ED, OP extends SelectOption>(entity: T, selection: Pick<ED[T]['Selection'], 'filter' | 'count'>, context: Cxt, option: OP): Promise<number>;
    begin(option?: TxnOption): Promise<string>;
    commit(txnId: string): Promise<void>;
    rollback(txnId: string): Promise<void>;
    exec(script: string, txnId?: string): Promise<void>;
}
