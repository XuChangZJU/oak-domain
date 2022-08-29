import { EntityDict } from '../base-app-domain';
import { UniversalContext } from '../store/UniversalContext';
import { OpSchema as Modi, Filter } from '../base-app-domain/Modi/Schema';
import { Checker, Operation, StorageSchema, EntityDict as BaseEntityDict, Context } from '../types';
export declare function createOperationsFromModies(modies: Modi[]): Array<{
    operation: Operation<string, Object, Object>;
    entity: string;
}>;
export declare function applyModis<ED extends EntityDict, Cxt extends UniversalContext<ED>>(filter: Filter, context: Cxt): Promise<import("../types").OperationResult<ED>>;
export declare function abandonModis<ED extends EntityDict, Cxt extends UniversalContext<ED>>(filter: Filter, context: Cxt): Promise<import("../types").OperationResult<ED>>;
export declare function createModiRelatedCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>): Checker<ED, keyof ED, Cxt>[];
