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
    /**
     * 根据当前操作条件，查找到满足actions（overlap关系）的relationId和relativePath
     */
    private relationalChecker;
    private selectFreeEntities;
    private constructRelationalChecker;
    constructor(schema: StorageSchema<ED>, actionCascadePathGraph: AuthCascadePath<ED>[], relationCascadePathGraph: AuthCascadePath<ED>[], authDeduceRelationMap: AuthDeduceRelationMap<ED>, selectFreeEntities: (keyof ED)[]);
    /**
     * 对Operation而言，找到最顶层对象的对应权限所在的relation，再查找actionAuth中其它子对象有无相对路径授权
     * 如一个cascade更新目标是(entity: a, action: 'update')：{
     *      b: {
     *          action: 'update',
     *          data: {
     *              c: {
     *                  action: 'update',
     *              },
     *          },
     *      },
     *      d$entity: [{
     *          action: 'create',
     *          data: {},
     *      }]
     * }
     * 则应检查的顶层对象是c，而b:update, a:update以及d:create都应该在c所对应权限的派生路径上
     * @param entity
     * @param operation
     */
    private destructCascadeOperation;
    checkRelationSync<T extends keyof ED, Cxt extends SyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt): void;
    private getDeducedCheckOperation;
    /**
     * 查询当前用户在对应entity上可以操作的relationIds
     * @param entity
     * @param entityId
     * @param context
     * @returns
     */
    private getGrantedRelationIds;
    private checkSpecialEntity;
    private checkActions;
    checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt): Promise<void>;
}
