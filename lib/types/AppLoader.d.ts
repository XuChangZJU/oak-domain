import { AsyncContext, AsyncRowStore } from "../store/AsyncRowStore";
import { EntityDict, OpRecord } from "./Entity";
export declare abstract class AppLoader<ED extends EntityDict, Cxt extends AsyncContext<ED>> {
    protected path: string;
    constructor(path: string);
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
