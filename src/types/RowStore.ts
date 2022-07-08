import { OperationResult, OperateParams, EntityDict, SelectionResult } from './Entity';
import { Context } from './Context';
import { StorageSchema } from './Storage';
import { OakErrorDefDict } from '../OakError';
import { get, set } from 'lodash';

export type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};

export abstract class RowStore<ED extends EntityDict, Cxt extends Context<ED>> {
    static $$LEVEL = 'store';
    static $$CODES: OakErrorDefDict = {
        primaryKeyConfilict: [1, '主键重复'],
        expressionUnresolved: [2, '表达式无法计算完成'],
        nodeIdRepeated: [3, '查询或投影中的nodeId重复'],
    };
    protected storageSchema: StorageSchema<ED>;
    // store实现CRUD动作的统一入口定义
    abstract operate<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        params?: OperateParams
    ): Promise<OperationResult<ED>>;

    abstract select<T extends keyof ED, S extends ED[T]['Selection']> (
        entity: T,
        selection: S,
        context: Cxt,
        params?: Object
    ): Promise<SelectionResult<ED[T]['Schema'], S['data']>>;

    abstract count<T extends keyof ED> (
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter'>,
        context: Cxt,
        params?: Object
    ): Promise<number>;

    constructor(storageSchema: StorageSchema<ED>) {
        this.storageSchema = storageSchema;
    }

    abstract begin(option?: TxnOption): Promise<string>;

    abstract commit(txnId: string): Promise<void>;

    abstract rollback(txnId: string): Promise<void>;

    getSchema () {
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

}