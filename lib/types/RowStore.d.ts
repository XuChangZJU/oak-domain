import { EntityDef, OperationResult, SelectionResult, OperateParams } from './Entity';
import { Context } from './Context';
import { StorageSchema } from './Storage';
import { OakErrorDefDict } from '../OakError';
export declare abstract class RowStore<ED extends {
    [E: string]: EntityDef;
}> {
    static $$LEVEL: string;
    static $$CODES: OakErrorDefDict;
    protected storageSchema: StorageSchema<ED>;
    abstract operate<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>, params?: OperateParams): Promise<OperationResult>;
    abstract select<T extends keyof ED>(entity: T, selection: ED[T]['Selection'], context: Context<ED>, params?: Object): Promise<SelectionResult<ED, T>>;
    abstract count<T extends keyof ED>(entity: T, selection: Omit<ED[T]['Selection'], 'data' | 'sorter' | 'action'>, context: Context<ED>, params?: Object): Promise<number>;
    constructor(storageSchema: StorageSchema<ED>);
}
