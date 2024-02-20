import { EntityDict } from './Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';

export type Algorithm = 'rsa' | 'ec' | 'ed25519';

export type RemotePushInfo = {
    url: string;
    userId: string;
};

export type RemotePullInfo = {
    id: string;
    publicKey: string;
    algorithm: Algorithm;
    userId: string;
};

export type SelfEncryptInfo = {
    id: string;
    privateKey: string;
    algorithm: Algorithm;
};

export interface SyncEntityDef<ED extends EntityDict & BaseEntityDict, T extends keyof ED> {
    entity: T;                              // 需要同步的entity
    path: string;                           // 此entity到需要同步到的根entity的路径（如果根entity和remote user之间不是relation关系，其最后指向user的路径在pathToUser中指定）
    recursive?: boolean;                    // 表明path的最后一项是递归的(暂时无用)
    relationName?: string;                  // 要同步的user与根对象的relation名称（为空说明是userId)
    direction: 'pull' | 'push' | 'bio';     // pull说明是从远端拉过来，push说明是从本地推过去，bio是双向
};

export interface SyncRemoteConfigBase<ED extends EntityDict & BaseEntityDict> {
    entity: keyof ED;                                   // 对方结点所关联的entity名称
    endpoint?: string;                                  // 对方结点同步数据的endpoint，默认为/sync/:entity
    pathToUser?: string;                                // entity到对应remote user的路径（如果remote user和enitity之间是relation关系则为空）
    relationName?: string;                              // 如果remote user和entity之间是relation关系，此处表达的是relation名称）
    syncEntities: Array<SyncEntityDef<ED, keyof ED>>;   // 在这个entity上需要同步的entities
};

interface SyncRemoteConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncRemoteConfigBase<ED> {
    getPushInfo: (userId: string, context: Cxt) => Promise<RemotePushInfo>;
    getPullInfo: (id: string, context: Cxt) => Promise<RemotePullInfo>;
};

export interface SyncSelfConfigBase<ED extends EntityDict & BaseEntityDict> {
    endpoint?: string;              // 本结点同步数据的endpoint，默认为/sync
};

interface SyncSelfConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncSelfConfigBase<ED>{
    getSelfEncryptInfo: (context: Cxt) => Promise<SelfEncryptInfo>;
};

export interface SyncConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    self: SyncSelfConfig<ED, Cxt>;
    remotes: Array<SyncRemoteConfig<ED, Cxt>>;
};
