import { Checker, EntityDict, OperateOption, SelectOption, StorageSchema, Trigger } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from './SyncRowStore';
/**
 *
 * @param checker 要翻译的checker
 * @param silent 如果silent，则row和relation类型的checker只会把限制条件加到查询上，而不报错（除掉create动作）
 * @returns
 */
export declare function translateCheckerInAsyncContext<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>>(checker: Checker<ED, T, Cxt>): {
    fn: Trigger<ED, T, Cxt>['fn'];
    when: 'before' | 'after';
};
export declare function translateCheckerInSyncContext<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED>>(checker: Checker<ED, T, Cxt>): {
    fn: (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
    when: 'before' | 'after';
};
/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema
 * @returns
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
export declare function createRemoveCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): Checker<ED, keyof ED, Cxt>[];
export declare function createCreateCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): Checker<ED, keyof ED, Cxt>[];
