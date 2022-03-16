import { RunningContext } from "./Context";
import { EntityDef } from "./Entity";

export interface Aspect<ED extends {
    [E: string]: EntityDef;
}>{
    (params: any, context: RunningContext<ED>): any;
};