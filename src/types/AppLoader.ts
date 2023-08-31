import { AsyncContext, AsyncRowStore } from "../store/AsyncRowStore";
import { EntityDict, OpRecord } from "./Entity";

export abstract class AppLoader<ED extends EntityDict, Cxt extends AsyncContext<ED>> {
    protected path: string;
    constructor(path: string) {
        this.path = path;
    }
    
    abstract execAspect(name: string, contextString?: string, params?: any): Promise<{
        opRecords?: OpRecord<ED>[];
        message?: string;
        result: any;
    }>;

    abstract initialize(dropIfExists?: boolean): Promise<void>;

    abstract mount(): Promise<void>;

    abstract unmount(): Promise<void>;

    abstract getStore(): AsyncRowStore<ED, Cxt>;
}