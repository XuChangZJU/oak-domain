/// <reference types="node" />
import { IncomingHttpHeaders } from 'http';
import { EntityDict, OpRecord, RowStore, TxnOption, Context } from "../types";
export declare abstract class UniversalContext<ED extends EntityDict> implements Context<ED> {
    rowStore: RowStore<ED, this>;
    uuid?: string;
    opRecords: OpRecord<ED>[];
    private scene?;
    private rwLock;
    private headers?;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    };
    constructor(store: RowStore<ED, UniversalContext<ED>>, headers?: IncomingHttpHeaders);
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
    getCurrentTxnId(): string | undefined;
    abstract toString(): Promise<string>;
    abstract getCurrentUserId(allowUnloggedIn?: boolean): Promise<string | undefined>;
}
