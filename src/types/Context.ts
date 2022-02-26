import { EntityDef, EntityShape } from './Entity';
import { RowStore } from './RowStore';
import { Txn } from './Txn';

export interface Context<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends EntityShape = EntityShape>{
    rowStore: RowStore<E, ED, SH>;
    on(event: 'commit' | 'rollback', callback: (context: Context<E, ED, SH>) => Promise<void>): void;
    begin(options?: object): Promise<void>;
    commit():Promise<void>;
    rollback():Promise<void>;
};
