import { EntityDict } from './Entity';
import { RowStore } from './RowStore';
import { Schema as Application } from '../base-domain/Application/Schema';
import { Schema as Token } from '../base-domain/Token/Schema';
export interface Context<ED extends EntityDict> {
    rowStore: RowStore<ED>;
    on(event: 'commit' | 'rollback', callback: (context: Context<ED>) => Promise<void>): void;
    begin(options?: object): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export interface RunningContext<ED extends EntityDict> extends Context<ED> {
    getApplication: () => Application;
    getToken: () => Token | undefined;
}
