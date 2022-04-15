import { OperationResult, OperateParams, EntityDict, SelectionResult2 } from './Entity';
import { Context } from './Context';
import { StorageSchema } from './Storage';
import { OakErrorDefDict } from '../OakError';
export declare type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};
export declare abstract class RowStore<ED extends EntityDict> {
    static $$LEVEL: string;
    static $$CODES: OakErrorDefDict;
    protected storageSchema: StorageSchema<ED>;
    abstract operate<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>, params?: OperateParams): Promise<OperationResult>;
    abstract select<T extends keyof ED, S extends ED[T]['Selection']>(entity: T, selection: S, context: Context<ED>, params?: Object): Promise<SelectionResult2<ED[T]['Schema'], S['data']>>;
    abstract count<T extends keyof ED>(entity: T, selection: Omit<ED[T]['Selection'], 'data' | 'sorter' | 'action'>, context: Context<ED>, params?: Object): Promise<number>;
    constructor(storageSchema: StorageSchema<ED>);
    abstract begin(option?: TxnOption): Promise<string>;
    abstract commit(txnId: string): Promise<void>;
    abstract rollback(txnId: string): Promise<void>;
}
