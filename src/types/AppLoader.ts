import { AsyncContext, AsyncRowStore } from "../store/AsyncRowStore";
import { EntityDict } from "./Entity";

export abstract class AppLoader<ED extends EntityDict, Cxt extends AsyncContext<ED>> {
    protected path: string;
    constructor(path: string) {
        this.path = path;
    }
    
    abstract execAspect(name: string, context: Cxt, params?: any): Promise<any>;

    abstract initialize(dropIfExists?: boolean): Promise<void>;

    abstract mount(): Promise<void>;

    abstract unmount(): Promise<void>;

    abstract getStore(): AsyncRowStore<ED, Cxt>;
}