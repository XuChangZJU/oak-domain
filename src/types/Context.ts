import { EntityDict, OpRecord } from './Entity';
import { RowStore } from './RowStore';


export interface Context<ED extends EntityDict>{
    opRecords: OpRecord<ED>[];
    rowStore: RowStore<ED, this>;
    begin(options?: object): Promise<void>;
    commit():Promise<void>;
    rollback():Promise<void>;
    getCurrentTxnId(): string | undefined;
    on(event: 'commit' | 'rollback', callback: () => Promise<void>): void;
};

