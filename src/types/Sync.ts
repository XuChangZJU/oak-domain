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
    cxtInfo?: any;
};

export type SelfEncryptInfo = {
    id: string;
    privateKey: string;
    algorithm: Algorithm;
};

export interface PullEntityDef<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> {
    direction: 'pull';
    entity: T;                              // 需要同步的entity
    path: string;                           // 此entity到需要同步到的根entity的路径（如果根entity和remote user之间不是relation关系，其最后指向user的路径在pathToUser中指定）
    recursive?: boolean;                    // 表明path的最后一项是递归的(暂时无用)
    relationName?: string;                  // 要同步的user与根对象的relation名称（为空说明是userId)

    // 可能两个结点的数据有异构，需要加工？但目前应该没有这种情况，除了一种：push的结点可能会多一些属性，此时在pull结点中实际操作前处理一下
    process?: <A extends ED[T]['Action']>(action: A, data: ED[T]['Operation']['data'], context: Cxt) => Promise<void>;
};

export interface PushEntityDef<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> {
    direction: 'push';
    entity: T;                              // 需要同步的entity
    path: string;                           // 此entity到需要同步到的根entity的路径（如果根entity和remote user之间不是relation关系，其最后指向user的路径在pathToUser中指定）
    recursive?: boolean;                    // 表明path的最后一项是递归的(暂时无用)
    relationName?: string;                  // 要同步的user与根对象的relation名称（为空说明是userId)
    actions?: ED[T]['Action'][];

    /**
     * 同步结果回调，根据接口的幂等原理，同步一定要完全成功再回调
     */
    onSynchronized?: (result: {
        action: ED[T]['Action'],
        data: ED[T]['Operation']['data'];
        rowIds: string[];
    }, context: Cxt) => Promise<void>,
};


export interface SyncRemoteConfigBase<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    entity: keyof ED;                                   // 对方结点所关联的entity名称（两边一致）    
    endpoint?: string;                                  // 对方结点同步数据的endpoint，默认为/sync/:entity
    pathToUser?: string;                                // entity到对应remote user的路径（如果remote user和enitity之间是relation关系则为空）
    relationName?: string;                              // 如果remote user和entity之间是relation关系，此处表达的是relation名称）
    pushEntities?: Array<PushEntityDef<ED, keyof ED, Cxt>>;     // 在这个entity上需要同步的entities
    pullEntities?: Array<PullEntityDef<ED, keyof ED, Cxt>>;     // 从这个entity上可能会接收到的同步entites
};

interface SyncRemoteConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncRemoteConfigBase<ED, Cxt> {
    getPushInfo: (context: Cxt, option: {
        remoteEntityId: string;
        userId: string;
    }) => Promise<RemotePushInfo>;
    getPullInfo: (context: Cxt, option: {
        selfId: string, 
        remoteEntityId: string,
    }) => Promise<RemotePullInfo>;
};

export interface SyncSelfConfigBase<ED extends EntityDict & BaseEntityDict> {
    endpoint?: string;              // 本结点同步数据的endpoint，默认为/sync
    entity: keyof ED;               // 本方结点所关联的entity名称（两边一致）
};

interface SyncSelfConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncSelfConfigBase<ED>{
    getSelfEncryptInfo: (context: Cxt) => Promise<SelfEncryptInfo>;
};

export interface SyncConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    self: SyncSelfConfig<ED, Cxt>;
    remotes: Array<SyncRemoteConfig<ED, Cxt>>;
};
