export declare type OmitInferKey<T, R> = {
    [K in keyof T as T extends R ? never : K]: T[K];
};
export declare type OmitInferValue<T, R> = {
    [K in keyof T as T extends R ? never : K]: T[K];
};
export declare type ValueOf<Obj> = Obj[keyof Obj];
export declare type OneOnly<Obj, Key extends keyof Obj> = {
    [key in Exclude<keyof Obj, Key>]?: undefined;
} & Pick<Obj, Key>;
export declare type OneOfByKey<Obj> = {
    [key in keyof Obj]: OneOnly<Obj, key>;
};
export declare type OneOf<Obj> = ValueOf<OneOfByKey<Obj>>;
