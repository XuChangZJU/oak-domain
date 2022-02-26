import { Context } from '../types/Context';
import { DeduceCreateOperation, DeduceCreateSingleOperation, DeduceRemoveOperation, DeduceUpdateOperation, EntityDef, EntityShape, SelectionResult } from "../types/Entity";
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
/**这个用来处理级联的select和update，对不同能力的 */
export declare abstract class CascadeStore<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends EntityShape = EntityShape> extends RowStore<E, ED, SH> {
    constructor(storageSchema: StorageSchema);
    protected abstract selectAbjointRow<T extends E>(entity: T, selection: Omit<ED[T]['Selection'], 'indexFrom' | 'count' | 'data' | 'sorter'>, context: Context<E, ED, SH>, params?: Object): Promise<SelectionResult<E, ED, T, SH>>;
    protected abstract updateAbjointRow<T extends E>(entity: T, operation: DeduceCreateSingleOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH>, context: Context<E, ED, SH>, params?: Object): Promise<void>;
    protected cascadeSelect<T extends E>(entity: T, selection: ED[T]['Selection'], context: Context<E, ED, SH>, params?: Object): Promise<SelectionResult<E, ED, T, SH>>;
    /**
     * 级联更新
     * A --> B
        多对一：A CREATE／B CREATE，B data的主键赋到A的data上
            A CREATE／B UPDATE，B filter的主键来自A的data
            A UPDATE／B CREATE，B data的主键赋到A的data上
            A UPDATE／B UPDATE，B filter的主键来自A的row
            A UPDATE／B REMOVE，B filter的主键来自A的row
            A REMOVE／B UPDATE，B filter的主键来自A的row
            A REMOVE／B REMOVE，B filter的主键来自A的row

        一对多：A CREATE／B CREATE，A data上的主键赋到B的data上
            A CREATE／B UPDATE，A data上的主键赋到B的data上
            A UPDATE／B CREATE，A filter上的主键赋到B的data上（一定是带主键的filter）
            A UPDATE／B UPDATE，A filter上的主键赋到B的filter上（一定是带主键的filter）
            A UPDATE／B REMOVE，A filter上的主键赋到B的filter上（一定是带主键的filter）
            A REMOVE／B UPDATE，A filter上的主键赋到B的filter上（且B关于A的外键清空）
            A REMOVE／B REMOVE，A filter上的主键赋到B的filter上
     * @param entity
     * @param operation
     * @param context
     * @param params
     */
    protected cascadeUpdate<T extends E>(entity: T, operation: DeduceCreateOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH>, context: Context<E, ED, SH>, params?: Object): Promise<void>;
}
