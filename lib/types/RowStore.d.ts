import { OperationResult, EntityDict } from './Entity';
import { StorageSchema } from './Storage';
import { AsyncContext } from '../store/AsyncRowStore';
export declare type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};
export declare type SelectionRewriter<ED extends EntityDict, Cxt extends AsyncContext<ED>> = (schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection'], context: Cxt) => Promise<void>;
export declare type OperationRewriter<ED extends EntityDict, Cxt extends AsyncContext<ED>> = (schema: StorageSchema<ED>, entity: keyof ED, operate: ED[keyof ED]['Operation'], context: Cxt) => Promise<void>;
export declare abstract class RowStore<ED extends EntityDict> {
    protected storageSchema: StorageSchema<ED>;
    constructor(storageSchema: StorageSchema<ED>);
    abstract registerOperationRewriter(rewriter: OperationRewriter<ED, AsyncContext<ED>>): void;
    abstract registerSelectionRewriter(rewriter: SelectionRewriter<ED, AsyncContext<ED>>): void;
    getSchema(): StorageSchema<ED>;
    mergeOperationResult(result: OperationResult<ED>, toBeMerged: OperationResult<ED>): void;
    mergeMultipleResults(toBeMerged: OperationResult<ED>[]): OperationResult<ED>;
}
