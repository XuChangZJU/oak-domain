import { EntityDict, OpRecord, RowStore, TxnOption, Context } from "../types";
export declare class UniversalContext<ED extends EntityDict> implements Context<ED> {
    rowStore: RowStore<ED>;
    uuid?: string;
    opRecords: OpRecord<ED>[];
    events: {
        commit: Array<(context: UniversalContext<ED>) => Promise<void>>;
        rollback: Array<(context: UniversalContext<ED>) => Promise<void>>;
    };
    constructor(store: RowStore<ED>);
    private resetEvents;
    on(event: 'commit' | 'rollback', callback: (context: UniversalContext<ED>) => Promise<void>): void;
    begin(options?: TxnOption): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    getCurrentTxnId(): string | undefined;
}
