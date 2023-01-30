import { OperationResult, EntityDict } from './Entity';
import { StorageSchema } from './Storage';
export type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};
export declare abstract class RowStore<ED extends EntityDict> {
    protected storageSchema: StorageSchema<ED>;
    constructor(storageSchema: StorageSchema<ED>);
    getSchema(): StorageSchema<ED>;
    mergeOperationResult(result: OperationResult<ED>, toBeMerged: OperationResult<ED>): void;
    mergeMultipleResults(toBeMerged: OperationResult<ED>[]): OperationResult<ED>;
}
