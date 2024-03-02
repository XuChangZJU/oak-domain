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
    entity: T;
    path: string;
    recursive?: boolean;
    relationName?: string;
    process?: <A extends ED[T]['Action']>(action: A, data: ED[T]['Operation']['data'], context: Cxt) => Promise<void>;
}
export interface PushEntityDef<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> {
    direction: 'push';
    entity: T;
    path: string;
    recursive?: boolean;
    relationName?: string;
    actions?: ED[T]['Action'][];
    /**
     * 同步结果回调，根据接口的幂等原理，同步一定要完全成功再回调
     */
    onSynchronized?: (result: {
        action: ED[T]['Action'];
        data: ED[T]['Operation']['data'];
        rowIds: string[];
    }, context: Cxt) => Promise<void>;
}
export interface SyncRemoteConfigBase<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    entity: keyof ED;
    endpoint?: string;
    pathToUser?: string;
    relationName?: string;
    pushEntities?: Array<PushEntityDef<ED, keyof ED, Cxt>>;
    pullEntities?: Array<PullEntityDef<ED, keyof ED, Cxt>>;
}
interface SyncRemoteConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncRemoteConfigBase<ED, Cxt> {
    getPushInfo: (context: Cxt, option: {
        remoteEntityId: string;
        userId: string;
    }) => Promise<RemotePushInfo>;
    getPullInfo: (context: Cxt, option: {
        selfId: string;
        remoteEntityId: string;
    }) => Promise<RemotePullInfo>;
}
export interface SyncSelfConfigBase<ED extends EntityDict & BaseEntityDict> {
    endpoint?: string;
    entity: keyof ED;
}
interface SyncSelfConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncSelfConfigBase<ED> {
    getSelfEncryptInfo: (context: Cxt) => Promise<SelfEncryptInfo>;
}
export interface SyncConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    self: SyncSelfConfig<ED, Cxt>;
    remotes: Array<SyncRemoteConfig<ED, Cxt>>;
}
export {};
