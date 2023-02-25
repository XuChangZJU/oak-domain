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
declare type IsOptional<T, K extends keyof T> = {
    [K1 in Exclude<keyof T, K>]: T[K1];
} & {
    K?: T[K];
} extends T ? K : never;
export declare type OptionalKeys<T> = {
    [K in keyof T]: IsOptional<T, K>;
}[keyof T];
export declare type SyncOrAsync<T> = T | Promise<T>;
export {};
