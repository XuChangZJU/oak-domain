// https://juejin.cn/post/7025851349103280164
// 通过 infer 排除特定 Key 的属性
export type OmitInferKey<T, R> = {
    [K in keyof T as T extends R ? never : K]: T[K];
};


// 通过 infer 排除特定 Value 的属性
export type OmitInferValue<T, R> = {
    [K in keyof T as T extends R ? never : K]: T[K];
};

export type ValueOf<Obj> = Obj[keyof Obj];
export type OneOnly<Obj, Key extends keyof Obj> = { [key in Exclude<keyof Obj, Key>]?: undefined } & Pick<Obj, Key>;
export type OneOfByKey<Obj> = { [key in keyof Obj]: OneOnly<Obj, key> };
export type OneOf<Obj> = ValueOf<OneOfByKey<Obj>>;
