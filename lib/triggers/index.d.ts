import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema, EntityDict } from '../types';
import { AsyncContext } from '../store/AsyncRowStore';
declare const _default: import("../types").Trigger<BaseEntityDict, "modi", AsyncContext<BaseEntityDict>>[];
export default _default;
export declare function createDynamicTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(schema: StorageSchema<ED>): import("../types").Trigger<ED, keyof ED, Cxt>[];
