import { EntityDict } from "../base-app-domain";
import { StorageSchema } from "../types";
import { AuthCascadePath, EntityDict as BaseEntityDict, AuthDeduceRelationMap } from "../types/Entity";
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from "./SyncRowStore";
export declare class RelationAuth<ED extends EntityDict & BaseEntityDict> {
    private actionCascadePathGraph;
    private relationCascadePathGraph;
    private authDeduceRelationMap;
    private schema;
    static SPECIAL_ENTITIES: string[];
    private selectFreeEntities;
    private createFreeEntities;
    private updateFreeEntities;
    constructor(schema: StorageSchema<ED>, actionCascadePathGraph: AuthCascadePath<ED>[], relationCascadePathGraph: AuthCascadePath<ED>[], authDeduceRelationMap: AuthDeduceRelationMap<ED>, selectFreeEntities?: (keyof ED)[], createFreeEntities?: (keyof ED)[], updateFreeEntities?: (keyof ED)[]);
    checkRelationSync<T extends keyof ED, Cxt extends SyncContext<ED>>(entity: T, operation: Omit<ED[T]['Operation'] | ED[T]['Selection'], 'id'>, context: Cxt): void;
    /**
     * 查询当前用户在对应entity上可以操作的relationIds
     * @param entity
     * @param entityId
     * @param context
     * @returns
     */
    private getGrantedRelationIds;
    checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: Omit<ED[T]['Operation'] | ED[T]['Selection'], 'id'>, context: Cxt): Promise<void>;
    private checkOperateSpecialEntities2;
    private getDeducedEntityFilters;
    /**
     * 对于selection，解构出最底层的对象，如果最底层的对象可以被访问，则父对象一定可以
     * 但对于deduce的子对象，不必再向底层查看（假设deduce对象一般都位于树的最底层附近）
     * @param entity
     * @param operation
     */
    private destructSelection;
    /**
     * 对于operation，解构出一个树形结构，以方便自顶向下的进行访问
     * 但对于deduce的子对象，不必再向底层查看
     * @param entity
     * @param selection
     */
    private destructOperation;
    /**
     * 定位到了当前用户所有可能的actionAuth，对单条actionAuth加以判断，找到可以满足当前操作的actionAuth
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @return  string代表用户获得授权的relationId，空字符串代表通过userId赋权，false代表失败
     */
    private filterActionAuths;
    /**
     * 对于有些特殊的查询（带很多$or的查询，多发生在系统级别），单个actionAuth无法满足，需要共同加以判定
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @param actions
     */
    private checkActionAuthInGroup;
    private checkSelection;
    private findActionAuthsOnNode;
    private checkOperationTree;
    private checkOperation;
    /**
     * 检查一个operation是否能被通过权限测试
     * 一个cascadeOperation是一棵树形结构：
     * * 对于select，只要叶子通过其父结点必然通过；
     * * 对于update，自顶向下进行检查，若父亲被权限S通过，则只需要检查子对于S有没有相对路径上的actionAuth
     *      另外在update中，还需要考虑自建userRelation的case（例如在电子商务网站上购买商品，创建订单同时创建用户和订单的关系）
     * @param entity
     * @param operation
     * @param context
     * @param actions
     * @returns
     */
    private checkActions2;
}
/**
 * 获取有对entity进行actions操作权限的userRelation关系
 * @param params
 * @param context
 * todo paths改成复数以后这里还未充分测试过
 */
export declare function getUserRelationsByActions<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>>(params: {
    entity: T;
    filter: ED[T]['Selection']['filter'];
    actions: ED[T]['Action'][];
    overlap?: boolean;
}, context: Cxt): Promise<{
    userRelations: ED["userRelation"]["Schema"][];
    userEntities: Promise<{
        entity: keyof ED;
        entityId: string;
        userId: string;
    }[]>[];
}>;
