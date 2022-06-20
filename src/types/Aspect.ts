import { EntityDict } from "./Entity";
import { Context } from './Context';

export interface Aspect<ED extends EntityDict, Cxt extends Context<ED>>{
    (params: any, context: Cxt): Promise<any>;
};

export type AspectProxy<ED extends EntityDict, Cxt extends Context<ED>, AD extends Record<string, Aspect<ED, Cxt>>> = {
    [K in keyof AD]: (p: Parameters<AD[K]>[0], scene: string) => ReturnType<AD[K]>;
};
