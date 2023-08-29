import { EntityDict, SubDataDef } from "./Entity";
import { OpRecord } from "./Entity";
import { AsyncContext } from "../store/AsyncRowStore";

export interface Aspect<ED extends EntityDict, Cxt extends AsyncContext<ED>>{
    (params: any, context: Cxt): Promise<any>;
};

export interface AspectWrapper<ED extends EntityDict, Cxt extends AsyncContext<ED>, AD extends Record<string, Aspect<ED, Cxt>>>{
    exec: <T extends keyof AD>(name: T, params: Parameters<AD[T]>[0]) => Promise<{
        result: Awaited<ReturnType<AD[T]>>;
        opRecords?: OpRecord<ED>[];
        message?: string | null;
    }>;

    /* sub: (data: Array<SubDataDef<ED, keyof ED>>) => Promise<void>;

    unsub: (ids: string[]) => Promise<void>;

    registerSubCallback: (callback: (records: OpRecord<ED>[]) => void) => Promise<void>; */
};