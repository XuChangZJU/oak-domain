import { Context, RowStore } from ".";
import { EntityDict } from "./Entity";
export declare abstract class AppLoader<ED extends EntityDict, Cxt extends Context<ED>> {
    protected path: string;
    constructor(path: string);
    abstract execAspect(name: string, context: Cxt, params?: any): Promise<any>;
    abstract initialize(dropIfExists?: boolean): Promise<void>;
    abstract mount(): Promise<void>;
    abstract unmount(): Promise<void>;
    abstract getStore(): RowStore<ED, Cxt>;
}
