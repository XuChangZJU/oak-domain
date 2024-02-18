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
    entity: T;                      // 需要同步的entity
    path: string;                   // 此entity到需要同步到的根对象的路径
    recursive?: boolean;            // 表明path的最后一项是递归的
    relationName?: string;          // 要同步的user与根对象的relation名称（为空说明是userId)
    direction: 'pull' | 'push';     // pull说明是从远端拉过来，push说明是从本地推过去
};

export interface SyncRemoteConfigBase<ED extends EntityDict & BaseEntityDict> {
    entity: keyof ED;                                   // 对方结点所关联的entity名称
    endpoint?: string;                                  // 对方结点同步数据的endpoint，默认为/sync/:entity
    syncEntities: Array<SyncEntityDef<ED, keyof ED>>;   // 在这个entity上需要同步的entities
};

interface SyncRemoteConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncRemoteConfigBase<ED> {
    getRemotePushInfo: (userId: string, context: Cxt) => Promise<RemotePushInfo>;
    getRemotePullInfo: (id: string, context: Cxt) => Promise<RemotePullInfo>;
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
