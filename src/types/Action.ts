import { EntityDict } from "./Entity";

export type Action = string;
export type State = string;

export type ActionDef<A extends Action, S extends State>  = {
    stm: {
        [a in A]: [p: S | S[], n: S];
    },
    is?: S,
};

export type ActionDictOfEntityDict<E extends EntityDict> = {
    [T in keyof E]?: {
        [A in keyof E[T]['OpSchema']]?: ActionDef<string, string>; 
    };
};