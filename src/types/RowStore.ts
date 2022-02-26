import { EntityDef, OperationResult, SelectionResult, EntityShape } from './Entity';
import { Context } from './Context';
import { StorageSchema } from './Storage';
import { OakErrorDefDict } from '../OakError';

export abstract class RowStore<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends EntityShape = EntityShape> {
    static $$LEVEL = 'store';
    static $$CODES: OakErrorDefDict = {
        primaryKeyConfilict: [1, '主键重复'],
        expressionUnresolved: [2, '表达式无法计算完成'],
        nodeIdRepeated: [3, '查询或投影中的nodeId重复'],
    };
    protected storageSchema: StorageSchema;
    // store实现CRUD动作的统一入口定义
    abstract operate<T extends E>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Context<E, ED, SH>,
        params?: Object
    ): Promise<void>;

    abstract select<T extends E> (
        entity: T,
        selection: ED[T]['Selection'],
        context: Context<E, ED, SH>,
        params?: Object
    ): Promise<SelectionResult<E, ED, T, SH>>;

    abstract count<T extends E> (
        entity: T,
        selection: Omit<ED[T]['Selection'], 'data' | 'sorter' | 'action'>,
        context: Context<E, ED, SH>,
        params?: Object
    ): Promise<number>;

    constructor(storageSchema: StorageSchema) {
        this.storageSchema = storageSchema;
    }
}