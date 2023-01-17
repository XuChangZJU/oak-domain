import { CascadeRelationItem, EntityDict } from "./Entity";
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

// 即在cascadePath指向的对象上，有relation关系。若relation为空则不限定关系
export type CascadeActionAuth<A extends Action = ''> = {
    [K in A | GenericAction]?: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[];
};
