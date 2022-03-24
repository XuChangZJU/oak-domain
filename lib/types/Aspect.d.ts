import { RunningContext } from "./Context";
import { EntityDict } from "./Entity";
export interface Aspect<ED extends EntityDict> {
    (params: any, context: RunningContext<ED>): Promise<any>;
}
