import { EntityDict, OpRecord, RowStore, TxnOption, Context } from "../types";
export declare abstract class UniversalContext<ED extends EntityDict> implements Context<ED> {
    rowStore: RowStore<ED, this>;
    uuid?: string;
    opRecords: OpRecord<ED>[];
    private scene?;
    events: {
        commit: Array<() => Promise<void>>;
        rollback: Array<() => Promise<void>>;
    };
    constructor(store: RowStore<ED, UniversalContext<ED>>);
    getScene(): string | undefined;
    setScene(scene?: string): void;
    private resetEvents;
    on(event: 'commit' | 'rollback', callback: () => Promise<void>): void;
    begin(options?: TxnOption): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    getCurrentTxnId(): string | undefined;
    abstract toString(): Promise<string>;
}
