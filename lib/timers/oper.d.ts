import { EntityDict } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
export declare type VaccumOperOption<ED extends EntityDict & BaseEntityDict> = {
    aliveLine: number;
    excludeOpers?: {
        [T in keyof ED]?: ED[T]['Action'][];
    };
    backupDir?: string;
    zip?: boolean;
};
/**
 * 将一定日期之前的oper对象清空
 * @param option
 * @param context
 * @returns
 */
export declare function vaccumOper<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(option: VaccumOperOption<ED>, context: Cxt): Promise<void>;
