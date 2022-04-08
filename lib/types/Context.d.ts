import { EntityDict, OpRecord } from './Entity';
import { RowStore } from './RowStore';
export interface Context<ED extends EntityDict> {
    opRecords: OpRecord<ED>[];
    rowStore: RowStore<ED>;
    on(event: 'commit' | 'rollback', callback: (context: Context<ED>) => Promise<void>): void;
    begin(options?: object): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
