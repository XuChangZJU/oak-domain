export type OmitInferKey<T, R> = {
    [K in keyof T as T extends R ? never : K]: T[K];
};
export type OmitInferValue<T, R> = {
    [K in keyof T as T extends R ? never : K]: T[K];
};
export type ValueOf<Obj> = Obj[keyof Obj];
export type OneOnly<Obj, Key extends keyof Obj> = {
    [key in Exclude<keyof Obj, Key>]?: undefined;
} & Pick<Obj, Key>;
export type OneOfByKey<Obj> = {
    [key in keyof Obj]: OneOnly<Obj, key>;
};
export type OneOf<Obj> = ValueOf<OneOfByKey<Obj>>;
type IsOptional<T, K extends keyof T> = {
    [K1 in Exclude<keyof T, K>]: T[K1];
} & {
    K?: T[K];
} extends T ? K : never;
export type OptionalKeys<T> = {
    [K in keyof T]: IsOptional<T, K>;
}[keyof T];
export {};
