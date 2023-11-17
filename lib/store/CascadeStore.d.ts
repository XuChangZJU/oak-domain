import { EntityDict, OperateOption, SelectOption, OperationResult, AggregationResult } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { OperationRewriter, RowStore, SelectionRewriter } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
/**这个用来处理级联的select和update，对不同能力的 */
export declare abstract class CascadeStore<ED extends EntityDict & BaseEntityDict> extends RowStore<ED> {
    constructor(storageSchema: StorageSchema<ED>);
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract supportMultipleCreate(): boolean;
    private selectionRewriters;
    private operationRewriters;
    private reinforceSelectionAsync;
    private reinforceSelectionSync;
    private reinforceSelectionInner;
    private reinforceOperation;
    registerOperationRewriter(rewriter: OperationRewriter<ED, AsyncContext<ED> | SyncContext<ED>>): void;
    registerSelectionRewriter(rewriter: SelectionRewriter<ED, AsyncContext<ED> | SyncContext<ED>>): void;
    protected abstract selectAbjointRow<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Partial<ED[T]['Schema']>[];
    protected abstract updateAbjointRow<T extends keyof ED, OP extends OperateOption, Cxt extends SyncContext<ED>>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): number;
    protected abstract selectAbjointRowAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Promise<Partial<ED[T]['Schema']>[]>;
    protected abstract updateAbjointRowAsync<T extends keyof ED, OP extends OperateOption, Cxt extends AsyncContext<ED>>(entity: T, operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'], context: Cxt, option: OP): Promise<number>;
    protected abstract aggregateSync<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(entity: T, aggregation: ED[T]['Aggregation'], context: Cxt, option: OP): AggregationResult<ED[T]['Schema']>;
    protected abstract aggregateAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(entity: T, aggregation: ED[T]['Aggregation'], context: Cxt, option: OP): Promise<AggregationResult<ED[T]['Schema']>>;
    protected destructCascadeSelect<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED> | AsyncContext<ED>>(entity: T, projection2: ED[T]['Selection']['data'], context: Cxt, cascadeSelectFn: <T2 extends keyof ED>(entity2: T2, selection: ED[T2]['Selection'], context: Cxt, op: OP) => Partial<ED[T2]['Schema']>[] | Promise<Partial<ED[T2]['Schema']>[]>, aggregateFn: <T2 extends keyof ED>(entity2: T2, aggregation: ED[T2]['Aggregation'], context: Cxt, op: OP) => AggregationResult<ED[T2]['Schema']> | Promise<AggregationResult<ED[T2]['Schema']>>, option: OP): {
        projection: ED[T]["Selection"]["data"];
        cascadeSelectionFns: ((result: Partial<ED[T]['Schema']>[]) => Promise<void> | void)[];
    };
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
     * @param action
     * @param data
     * @param context
     * @param option
     * @param result
     * @param filter
     * @returns
     */
    protected destructCascadeUpdate<T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>, OP extends OperateOption, R>(entity: T, action: ED[T]['Action'], data: ED[T]['CreateSingle']['data'] | ED[T]['Update']['data'] | ED[T]['Remove']['data'], context: Cxt, option: OP, cascadeUpdate: <T2 extends keyof ED>(entity: T2, operation: ED[T2]['Operation'], context: Cxt, option: OP) => R, filter?: ED[T]['Update']['filter']): {
        data: Record<string, any>;
        beforeFns: (() => R)[];
        afterFns: (() => R)[];
    };
    protected preProcessDataCreated<T extends keyof ED>(entity: T, data: ED[T]['Create']['data']): void;
    protected preProcessDataUpdated(data: Record<string, any>): void;
    judgeRelation(entity: keyof ED, attr: string): string | 1 | 2 | string[] | 0;
    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    private doUpdateSingleRowAsync;
    private doUpdateSingleRow;
    protected cascadeUpdate<T extends keyof ED, Cxt extends SyncContext<ED>, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): OperationResult<ED>;
    /**
     *
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    protected cascadeUpdateAsync<T extends keyof ED, Cxt extends AsyncContext<ED>, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): Promise<OperationResult<ED>>;
    protected cascadeSelect<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Partial<ED[T]['Schema']>[];
    /**
     * 将一次查询的结果集加入result
     * todo 如果是supportMtoOJoin，这里还要解构（未充分测试）
     * @param entity
     * @param rows
     * @param context
     */
    private addToResultSelections;
    private addSingleRowToResultSelections;
    protected cascadeSelectAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Promise<Partial<ED[T]['Schema']>[]>;
    protected selectAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Promise<Partial<ED[T]['Schema']>[]>;
    protected selectSync<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(entity: T, selection: ED[T]['Selection'], context: Cxt, option: OP): Partial<ED[T]['Schema']>[];
    protected operateSync<T extends keyof ED, Cxt extends SyncContext<ED>, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): OperationResult<ED>;
    protected operateAsync<T extends keyof ED, Cxt extends AsyncContext<ED>, OP extends OperateOption>(entity: T, operation: ED[T]['Operation'], context: Cxt, option: OP): Promise<OperationResult<ED>>;
}
