import { OperationResult, EntityDict } from './Entity';
import { StorageSchema } from './Storage';
export declare type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};
export declare type SelectionRewriter<ED extends EntityDict> = (schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection']) => void;
export declare type OperationRewriter<ED extends EntityDict> = (schema: StorageSchema<ED>, entity: keyof ED, operate: ED[keyof ED]['Operation']) => void;
export declare abstract class RowStore<ED extends EntityDict> {
    protected storageSchema: StorageSchema<ED>;
    constructor(storageSchema: StorageSchema<ED>);
    abstract registerOperationRewriter(rewriter: OperationRewriter<ED>): void;
    abstract registerSelectionRewriter(rewriter: SelectionRewriter<ED>): void;
    getSchema(): StorageSchema<ED>;
    mergeOperationResult(result: OperationResult<ED>, toBeMerged: OperationResult<ED>): void;
    mergeMultipleResults(toBeMerged: OperationResult<ED>[]): OperationResult<ED>;
}
