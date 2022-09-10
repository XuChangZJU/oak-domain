import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict, Context } from '../types';
declare const _default: import("../types").Trigger<BaseEntityDict, "modi", import("../store/UniversalContext").UniversalContext<BaseEntityDict>>[];
export default _default;
export declare function createDynamicTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>): void;
