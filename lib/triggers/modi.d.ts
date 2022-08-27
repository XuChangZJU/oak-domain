import { EntityDict } from "../base-app-domain";
import { Trigger } from "../types";
import { UniversalContext } from "../store/UniversalContext";
declare const triggers: Trigger<EntityDict, 'modi', UniversalContext<EntityDict>>[];
export default triggers;
