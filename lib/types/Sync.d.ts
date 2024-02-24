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
    onSynchronized?: (result: {
        action: ED[T]['Action'];
        data: ED[T]['Operation']['data'];
        result: Array<{
            userId: string;
            rowIds: string[];
            error?: Error;
        }>;
    }, context: Cxt) => Promise<void>;
}
export interface SyncRemoteConfigBase<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    entity: keyof ED;
    entitySelf?: keyof ED;
    endpoint?: string;
    pathToUser?: string;
    relationName?: string;
    pushEntities?: Array<PushEntityDef<ED, keyof ED, Cxt>>;
    pullEntities?: Array<PullEntityDef<ED, keyof ED, Cxt>>;
}
interface SyncRemoteConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncRemoteConfigBase<ED, Cxt> {
    getPushInfo: (userId: string, context: Cxt) => Promise<RemotePushInfo>;
    getPullInfo: (id: string, context: Cxt) => Promise<RemotePullInfo>;
}
export interface SyncSelfConfigBase<ED extends EntityDict & BaseEntityDict> {
    endpoint?: string;
    entitySelf: keyof ED;
}
interface SyncSelfConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> extends SyncSelfConfigBase<ED> {
    getSelfEncryptInfo: (context: Cxt) => Promise<SelfEncryptInfo>;
}
export interface SyncConfig<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    self: SyncSelfConfig<ED, Cxt>;
    remotes: Array<SyncRemoteConfig<ED, Cxt>>;
}
export {};
