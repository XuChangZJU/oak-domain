import { EntityDict } from "../base-app-domain";
import { AsyncContext } from "../store/AsyncRowStore";
import { Trigger } from "../types";
declare const triggers: Trigger<EntityDict, 'modi', AsyncContext<EntityDict>>[];
export default triggers;
