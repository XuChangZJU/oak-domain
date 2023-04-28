import { EntityDict } from "../base-app-domain";
import { StorageSchema, Trigger } from "../types";
import { AuthCascadePath, EntityDict as BaseEntityDict } from "../types/Entity";
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from "./SyncRowStore";
export declare class RelationAuth<ED extends EntityDict & BaseEntityDict> {
    private actionCascadePathGraph;
    private relationCascadePathGraph;
    private schema;
    private relationalFilterMaker;
    private relationalCreateChecker;
    private directActionAuthMap;
    private freeActionAuthMap;
    private constructFilterMaker;
    constructor(actionCascadePathGraph: AuthCascadePath<ED>[], relationCascadePathGraph: AuthCascadePath<ED>[], schema: StorageSchema<ED>);
    private makeDirectionActionAuthMap;
    setDirectionActionAuths(directActionAuths: ED['directActionAuth']['OpSchema'][]): void;
    setFreeActionAuths(freeActionAuths: ED['freeActionAuth']['OpSchema'][]): void;
    private upsertFreeActionAuth;
    private upsertDirectActionAuth;
    private removeDirectActionAuth;
    checkRelationSync<T extends keyof ED, Cxt extends SyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt): void;
    checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt): Promise<void>;
    /**
     * 后台需要注册数据变化的监听器，以保证缓存的维度数据准确
     * 在集群上要支持跨结点的监听器(todo)
     */
    getAuthDataTriggers<Cxt extends AsyncContext<ED>>(): Trigger<ED, keyof ED, Cxt>[];
}
