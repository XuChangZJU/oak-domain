import { OperationResult, EntityDict } from './Entity';
import { StorageSchema } from './Storage';
import { get, set } from '../utils/lodash';
import { AsyncContext } from '../store/AsyncRowStore';
import { SyncContext } from '../store/SyncRowStore';

export type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};

export type SelectionRewriter<ED extends EntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>> = (
    schema: StorageSchema<ED>,
    entity: keyof ED,
    selection: ED[keyof ED]['Selection'] | ED[keyof ED]['Aggregation'],
    context: Cxt,
) => void | Promise<void>;
export type OperationRewriter<ED extends EntityDict, Cxt extends AsyncContext<ED>| SyncContext<ED>> = (
    schema: StorageSchema<ED>,
    entity: keyof ED,
    operate: ED[keyof ED]['Operation'],
    context: Cxt
) => void | Promise<void>;


export abstract class RowStore<ED extends EntityDict> {
    protected storageSchema: StorageSchema<ED>;

    constructor(storageSchema: StorageSchema<ED>) {
        this.storageSchema = storageSchema;
    }

    abstract registerOperationRewriter(rewriter: OperationRewriter<ED, AsyncContext<ED> | SyncContext<ED>>): void;

    abstract registerSelectionRewriter(rewriter: SelectionRewriter<ED, AsyncContext<ED> | SyncContext<ED>>): void;

    getSchema() {
        return this.storageSchema;
    }

    mergeOperationResult(result: OperationResult<ED>, toBeMerged: OperationResult<ED>) {
        for (const entity in toBeMerged) {
            for (const action in toBeMerged[entity]) {
                const value = get(result, `${entity}.${action}`);
                if (typeof value === 'number') {
                    set(result, `${entity}.${action}`, value + toBeMerged[entity]![action]!);
                }
                else {
                    set(result, `${entity}.${action}`, toBeMerged[entity]![action]!);
                }
            }
        }
    }

    mergeMultipleResults(toBeMerged: OperationResult<ED>[]) {
        const result: OperationResult<ED> = {};
        toBeMerged.forEach(
            ele => this.mergeOperationResult(result, ele)
        );
        return result;
    }
};
