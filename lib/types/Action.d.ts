export declare type Action = string;
export declare type State = string;
export declare type ActionDef<A extends Action, S extends State> = {
    stm: {
        [a in A]: [p: S | S[], n: S];
    };
    is?: S;
};
