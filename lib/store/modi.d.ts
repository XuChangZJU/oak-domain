import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { UniversalContext } from '../store/UniversalContext';
import { OpSchema as Modi } from '../base-app-domain/Modi/Schema';
import { Checker, Operation, StorageSchema, EntityDict, Context } from '../types';
export declare function createOperationsFromModies(modies: Modi[]): Array<{
    operation: Operation<string, Object, Object>;
    entity: string;
}>;
export declare function applyModis<ED extends EntityDict & BaseEntityDict, Cxt extends UniversalContext<ED>>(filter: ED['modi']['Selection']['filter'], context: Cxt): Promise<import("../types").OperationResult<ED>>;
export declare function abandonModis<ED extends EntityDict & BaseEntityDict, Cxt extends UniversalContext<ED>>(filter: ED['modi']['Selection']['filter'], context: Cxt): Promise<import("../types").OperationResult<ED>>;
export declare function createModiRelatedCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>): Checker<ED, keyof ED, Cxt>[];
