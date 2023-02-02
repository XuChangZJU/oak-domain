import { AuthDefDict, Checker, EntityDict, OperateOption, SelectOption, StorageSchema, Trigger } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from './SyncRowStore';
export declare function translateCheckerInAsyncContext<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(checker: Checker<ED, keyof ED, Cxt>): {
    fn: Trigger<ED, keyof ED, Cxt>['fn'];
    when: 'before' | 'after';
};
export declare function translateCheckerInSyncContext<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED>>(checker: Checker<ED, T, Cxt>): {
    fn: (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
    when: 'before' | 'after';
};
/**
 * 根据权限定义，创建出相应的checker
 * @param schema
 * @param authDict
 * @returns
 */
export declare function createAuthCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>, authDict: AuthDefDict<ED>): Checker<ED, keyof ED, Cxt>[];
/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema
 * @returns
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
export declare function createRemoveCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): Checker<ED, keyof ED, Cxt>[];
