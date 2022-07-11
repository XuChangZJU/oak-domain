import { EntityShape } from "./Entity";

type Language = 'zh_CN' | 'en_US';

type LocaleOfSchema<S extends Record<string, any>> = {
    [A in keyof Required<Omit<S, keyof EntityShape>>]: string;
};

type LocaleOfStringEnum<A extends string> = {
    [K in A]: string;
};

type LocaleOfValue<V extends Record<string, string>> = {
    [K in keyof V]: {
        [K2 in V[K]]: string;
    }
};

export type LocaleDef<Sc extends Record<string, any>, Ac extends string, R extends string, V extends Record<string, string>> = {
    [L in Language]?: {
        attr: LocaleOfSchema<Sc> & {
            [A in keyof V]: string;     // 目前写在V里面的应该只有枚举变量和state
        };
        action?: LocaleOfStringEnum<Ac>;
        r?: LocaleOfStringEnum<R>;
        v?: LocaleOfValue<V> ;
    };
};