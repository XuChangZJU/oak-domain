export type Action = string;
export type State = string;

export type ActionDef<A extends Action, S extends State>  = {
    stm: {
        [a in A]: [p: S | S[], n: S];
    },
    is?: S,
};