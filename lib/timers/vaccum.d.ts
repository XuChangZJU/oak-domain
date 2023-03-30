import { EntityDict } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
declare type VaccumOptionEntity<ED extends EntityDict & BaseEntityDict, T extends keyof ED> = {
    entity: T;
    filter?: ED[T]['Selection']['filter'];
    aliveLine: number;
};
declare type VaccumOption<ED extends EntityDict & BaseEntityDict> = {
    entities: Array<VaccumOptionEntity<ED, keyof ED>>;
    backupDir?: string;
    zip?: boolean;
};
/**
 * 删除数据库中的部分数据，减少体积
 * @param option
 */
export declare function vaccumEntities<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(option: VaccumOption<ED>, context: Cxt): Promise<void>;
export {};
