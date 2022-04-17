import { EntityDict } from "./Entity";
import { Context } from './Context';
export interface Aspect<ED extends EntityDict, Cxt extends Context<ED>> {
    (params: any, context: Cxt): Promise<any>;
}
