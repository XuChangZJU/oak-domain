import { OperationResult, OperateParams, EntityDict, SelectionResult2 } from './Entity';
import { Context } from './Context';
import { StorageSchema } from './Storage';
import { OakErrorDefDict } from '../OakError';

export type TxnOption = {
    isolationLevel: 'repeatable read' | 'serializable';
};

export abstract class RowStore<ED extends EntityDict> {
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
        context: Context<ED>,
        params?: OperateParams
    ): Promise<OperationResult>;

    abstract select<T extends keyof ED, S extends ED[T]['Selection']> (
        entity: T,
        selection: S,
        context: Context<ED>,
        params?: Object
    ): Promise<SelectionResult2<ED[T]['Schema'], S['data']>>;

    abstract count<T extends keyof ED> (
        entity: T,
        selection: Omit<ED[T]['Selection'], 'data' | 'sorter' | 'action'>,
        context: Context<ED>,
        params?: Object
    ): Promise<number>;

    constructor(storageSchema: StorageSchema<ED>) {
        this.storageSchema = storageSchema;
    }

    abstract begin(option?: TxnOption): Promise<string>;

    abstract commit(txnId: string): Promise<void>;

    abstract rollback(txnId: string): Promise<void>;
}