import { OperationResult, EntityDict } from './Entity';
import { StorageSchema } from './Storage';
import { AsyncContext } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';
export type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};
export type SelectionRewriter<ED extends EntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>> = (schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection'], context: Cxt) => void | Promise<void>;
export type OperationRewriter<ED extends EntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>> = (schema: StorageSchema<ED>, entity: keyof ED, operate: ED[keyof ED]['Operation'], context: Cxt) => void | Promise<void>;
export declare abstract class RowStore<ED extends EntityDict> {
    protected storageSchema: StorageSchema<ED>;
    constructor(storageSchema: StorageSchema<ED>);
    abstract registerOperationRewriter(rewriter: OperationRewriter<ED, AsyncContext<ED> | SyncContext<ED>>): void;
    abstract registerSelectionRewriter(rewriter: SelectionRewriter<ED, AsyncContext<ED> | SyncContext<ED>>): void;
    getSchema(): StorageSchema<ED>;
    mergeOperationResult(result: OperationResult<ED>, toBeMerged: OperationResult<ED>): void;
    mergeMultipleResults(toBeMerged: OperationResult<ED>[]): OperationResult<ED>;
}
