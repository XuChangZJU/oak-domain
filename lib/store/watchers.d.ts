import { Context, EntityDict, StorageSchema, Watcher } from "../types";
export declare function makeIntrinsicWatchers<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>): Watcher<ED, keyof ED, Cxt>[];
