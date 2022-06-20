import { Context } from ".";
import { EntityDict } from "./Entity";
export declare abstract class AppLoader<ED extends EntityDict, Cxt extends Context<ED>> {
    protected path: string;
    constructor(path: string);
    abstract goAspect(name: string, context: Cxt, params?: any): Promise<any>;
}
