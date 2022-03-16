import { EntityDef, EntityShape } from './Entity';
import { RowStore } from './RowStore';
import { Schema as Application } from '../entities/Application';
import { Schema as Token } from '../entities/Token';


export interface Context<ED extends {
    [E: string]: EntityDef;
}>{
    rowStore: RowStore<ED>;
    on(event: 'commit' | 'rollback', callback: (context: Context<ED>) => Promise<void>): void;
    begin(options?: object): Promise<void>;
    commit():Promise<void>;
    rollback():Promise<void>;
};

export interface RunningContext<ED extends {
    [E: string]: EntityDef;
}> extends Context<ED> {
    application: Application;
    token?: Token;
};
