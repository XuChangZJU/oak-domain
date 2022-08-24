import { Context } from '../types/Context';
import { EntityDict, OperateOption, SelectOption, OperationResult, SelectRowShape } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
/**这个用来处理级联的select和update，对不同能力的 */
export declare abstract class CascadeStore<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>> extends RowStore<ED, Cxt> {
    constructor(storageSchema: StorageSchema<ED>);
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract supportMultipleCreate(): boolean;
    protected abstract selectAbjointRow<T extends keyof ED, S extends ED[T]['Selection'], OP extends SelectOption>(entity: T, selection: S, context: Cxt, option: OP): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]>;
    protected abstract updateAbjointRow<T extends keyof ED, OP extends OperateOption>(entity: T, operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'], context: Cxt, option: OP): Promise<number>;
    /**
     * 将一次查询的结果集加入result
     * @param entity
     * @param rows
     * @param context
     */
    private addToResultSelections;
    protected cascadeSelect<T extends keyof ED, S extends ED[T]['Selection'], OP extends SelectOption>(entity: T, selection: S, context: Cxt, option: OP): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]>;
    private destructCascadeUpdate;
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
     *
     * 延时更新，
     *  A（业务级别的申请对象） ---> B（业务级别需要更新的对象）
     * 两者必须通过entity/entityId关联
     * 此时需要把对B的更新记录成一条新插入的Modi对象，并将A上的entity/entityId指向该对象（新生成的Modi对象的id与此operation的id保持一致）
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    protected cascadeUpdate<T extends keyof ED, OP extends OperateOption>(entity: T, operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'], context: Cxt, option: OP): Promise<OperationResult<ED>>;
    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    private doUpdateSingleRow;
    judgeRelation(entity: keyof ED, attr: string): string | string[] | 1 | 0 | 2;
}
