import { CascadeRelationItem, EntityDict } from "./Entity";
import { GenericAction } from '../actions/action';
export declare type Action = string;
export declare type State = string;
export declare type ActionDef<A extends Action, S extends State> = {
    stm: {
        [a in A]: [p: S | S[], n: S];
    };
    is?: S;
};
export declare type ActionDictOfEntityDict<E extends EntityDict> = {
    [T in keyof E]?: {
        [A in keyof E[T]['OpSchema']]?: ActionDef<string, string>;
    };
};
export declare type CascadeActionAuth<A extends Action = ''> = {
    [K in A | GenericAction]?: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[];
};
