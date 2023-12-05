import { EntityDict } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema } from '..';
export declare function makeProjection<ED extends BaseEntityDict & EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>): ED[T]["Selection"]["data"];
