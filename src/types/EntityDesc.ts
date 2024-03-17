import { LocaleDef } from './Locale';
import { Index } from './Storage';
import { EntityShape, Configuration, EntityDict } from './Entity';

export type EntityDesc<
    Schema extends EntityShape, 
    Action extends string = '',
    Relation extends string = '', 
    V extends Record<string, string> = {}> = {
    locales: LocaleDef<Schema, Action, Relation, V>;
    indexes?: Index<Schema>[];
    configuration?: Configuration;
    recursiveDepth?: number;
};


// 定义对象的更新条件，在什么状态下可以更新什么属性
export type AttrUpdateMatrix<ED extends EntityDict> = {
    [T in keyof ED]?: {
        [A in keyof ED[T]['OpSchema']]?: NonNullable<ED[T]['Selection']['filter']>;
    };
};