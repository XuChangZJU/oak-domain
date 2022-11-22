import { EntityDict, RowStore, OperateOption, OperationResult, SelectOption, TxnOption, Context } from "../types";
export declare abstract class SyncContext<ED extends EntityDict> implements Context {
    private rowStore;
    private uuid?;
    constructor(rowStore: SyncRowStore<ED, SyncContext<ED>>);
    abstract getCurrentUserId(allowUnloggedIn?: boolean): string | undefined;
    abstract isRoot(): boolean;
    abstract toString(): string;
    begin(option?: TxnOption): void;
    commit(): void;
    rollback(): void;
    getCurrentTxnId(): string | undefined;
    getSchema(): import("../types").StorageSchema<ED>;
    operate<T extends keyof ED, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], option: OP): OperationResult<ED>;
    select<T extends keyof ED, OP extends SelectOption>(entity: T, selection: ED[T]['Selection'], option: OP): Partial<ED[T]["Schema"]>[];
    count<T extends keyof ED, OP extends SelectOption>(entity: T, selection: Pick<ED[T]['Selection'], 'filter' | 'count'>, option: OP): number;
}
export interface SyncRowStore<ED extends EntityDict, Cxt extends Context> extends RowStore<ED> {
    operate<T extends keyof ED, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): OperationResult<ED>;
    select<T extends keyof ED, OP extends SelectOption>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Partial<ED[T]['Schema']>[];
    count<T extends keyof ED, OP extends SelectOption>(entity: T, selection: Pick<ED[T]['Selection'], 'filter' | 'count'>, context: Cxt, option: OP): number;
    begin(option?: TxnOption): string;
    commit(txnId: string): void;
    rollback(txnId: string): void;
}
