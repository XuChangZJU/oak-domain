import { Context } from '../types/Context';
import { DeduceCreateMultipleOperation, DeduceCreateOperation, DeduceCreateSingleOperation, DeduceRemoveOperation, DeduceUpdateOperation, EntityDict, OperateOption, SelectOption, OperationResult, SelectRowShape } from "../types/Entity";
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
/**这个用来处理级联的select和update，对不同能力的 */
export declare abstract class CascadeStore<ED extends EntityDict, Cxt extends Context<ED>> extends RowStore<ED, Cxt> {
    constructor(storageSchema: StorageSchema<ED>);
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract supportMultipleCreate(): boolean;
    protected abstract selectAbjointRow<T extends keyof ED, S extends ED[T]['Selection']>(entity: T, selection: S, context: Cxt, option?: SelectOption): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]>;
    protected abstract updateAbjointRow<T extends keyof ED>(entity: T, operation: DeduceCreateMultipleOperation<ED[T]['Schema']> | DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>, context: Cxt, option?: OperateOption): Promise<number>;
    protected cascadeSelect<T extends keyof ED, S extends ED[T]['Selection']>(entity: T, selection: S, context: Cxt, option?: SelectOption): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]>;
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
     * @param option
     */
    protected cascadeUpdate<T extends keyof ED>(entity: T, operation: DeduceCreateOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>, context: Cxt, option?: OperateOption): Promise<OperationResult<ED>>;
    judgeRelation(entity: keyof ED, attr: string): string | string[] | 1 | 0 | 2;
}
