import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { OpSchema as Modi } from '../base-app-domain/Modi/Schema';
import { Operation, StorageSchema, RowChecker, EntityDict, OperateOption, Trigger } from '../types';
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';
export declare function createOperationsFromModies(modies: Modi[]): Array<{
    operation: Operation<string, Object, Object>;
    entity: string;
}>;
export declare function applyModis<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, Op extends OperateOption>(filter: ED['modi']['Selection']['filter'], context: Cxt, option: Op): Promise<import("../types").OperationResult<ED>>;
export declare function abandonModis<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, Op extends OperateOption>(filter: ED['modi']['Selection']['filter'], context: Cxt, option: Op): Promise<import("../types").OperationResult<ED>>;
export declare function createModiRelatedCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): RowChecker<ED, keyof ED, Cxt>[];
export declare function createRelationHierarchyCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>): void;
export declare function createModiRelatedTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(schema: StorageSchema<ED>): Trigger<ED, keyof ED, Cxt>[];
