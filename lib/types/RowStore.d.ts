import { EntityDef, SelectionResult, EntityShape } from './Entity';
import { Context } from './Context';
import { StorageSchema } from './Storage';
import { OakErrorDefDict } from '../OakError';
export declare abstract class RowStore<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends EntityShape = EntityShape> {
    static $$LEVEL: string;
    static $$CODES: OakErrorDefDict;
    protected storageSchema: StorageSchema;
    abstract operate<T extends E>(entity: T, operation: ED[T]['Operation'], context: Context<E, ED, SH>, params?: Object): Promise<void>;
    abstract select<T extends E>(entity: T, selection: ED[T]['Selection'], context: Context<E, ED, SH>, params?: Object): Promise<SelectionResult<E, ED, T, SH>>;
    abstract count<T extends E>(entity: T, selection: Omit<ED[T]['Selection'], 'data' | 'sorter' | 'action'>, context: Context<E, ED, SH>, params?: Object): Promise<number>;
    constructor(storageSchema: StorageSchema);
}
