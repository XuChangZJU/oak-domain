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
    entity: T;
    path: string;
    recursive?: boolean;
    relationName?: string;
    direction: 'pull' | 'push';
}
export interface SyncRemoteConfigBase<ED extends EntityDict & BaseEntityDict> {
    entity: keyof ED;
    endpoint?: string;
    syncEntities: Array<SyncEntityDef<ED, keyof ED>>;
}
interface SyncRemoteConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncRemoteConfigBase<ED> {
    getRemotePushInfo: (userId: string, context: Cxt) => Promise<RemotePushInfo>;
    getRemotePullInfo: (id: string, context: Cxt) => Promise<RemotePullInfo>;
}
export interface SyncSelfConfigBase<ED extends EntityDict & BaseEntityDict> {
    endpoint?: string;
}
interface SyncSelfConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncSelfConfigBase<ED> {
    getSelfEncryptInfo: (context: Cxt) => Promise<SelfEncryptInfo>;
}
export interface SyncConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    self: SyncSelfConfig<ED, Cxt>;
    remotes: Array<SyncRemoteConfig<ED, Cxt>>;
}
export {};
