import { LocaleDef } from './Locale';
import { Index } from './Storage';
import { EntityShape, Configuration, EntityDict } from './Entity';
export type EntityDesc<Schema extends EntityShape, Action extends string = '', Relation extends string = '', V extends Record<string, string> = {}> = {
    locales: LocaleDef<Schema, Action, Relation, V>;
    indexes?: Index<Schema>[];
    configuration?: Configuration;
    recursiveDepth?: number;
};
export type AttrUpdateMatrix<ED extends EntityDict> = {
    [T in keyof ED]?: {
        [A in keyof ED[T]['OpSchema']]?: {
            action?: ED[T]['Action'][];
            filter?: NonNullable<ED[T]['Selection']['filter']>;
        };
    };
};
