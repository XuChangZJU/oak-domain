import { EntityDict } from "./Entity";
import { GenericAction } from '../actions/action';

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

export type CascadeActionItem = {
    cascadePath: string;
    relation: string[];
}

export type CascadeActionAuth<A extends Action = ''> = {
    [K in A | GenericAction]?: CascadeActionItem | (CascadeActionItem | CascadeActionItem[])[];
};
