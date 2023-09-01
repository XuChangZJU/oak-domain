import { LocaleDef } from './Locale';
import { Index } from './Storage';
import { EntityShape, Configuration } from './Entity';

export type EntityDesc<
    Schema extends EntityShape, 
    Action extends string = '',
    Relation extends string = '', 
    V extends Record<string, string> = {}> = {
    locales: LocaleDef<Schema, Action, Relation, V>;
    indexes?: Index<Schema>[];
    configuration?: Configuration;
}