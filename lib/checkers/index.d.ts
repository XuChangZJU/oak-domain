import { EntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict as BaseEntityDict, Context } from '../types';
export declare function createDynamicCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>): import("../types").Checker<ED, keyof ED, Cxt>[];
