import { ActionDictOfEntityDict, Checker, EntityDict, StorageSchema, AttrUpdateMatrix } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { EntityDict as BaseEntityDict } from '../base-app-domain/EntityDict';
export declare function makeIntrinsicCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>, attrUpdateMatrix?: AttrUpdateMatrix<ED>): Checker<ED, keyof ED, Cxt | FrontCxt>[];
