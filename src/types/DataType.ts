import { Geo, SingleGeo } from "./Geo";

export type Int<L extends 1 | 2 | 4 | 8> = number;
export type Uint<L extends 1 | 2 | 4 | 8> = number;
export type Double<P extends number, S extends number> = number;
export type Float<P extends number, S extends number> = number;
export type String<L extends number> = string;
export type Text = string;
export type Image = string;
export type File = string;
export type Datetime = number | Date;
export type Boolean = boolean;
export type PrimaryKey = string;
export type ForeignKey<E extends string> = string;
export { Geo, SingleGeo } from './Geo';

export type DataTypes = number | string | Datetime | Geo | Object | SingleGeo;

export const types = ['Int', 'Uint', 'Double', 'Float', 'String', 'Text', 'Datetime', 'Boolean', 'Image', 'File', 'Geo', 'SingleGeo'];
export const unIndexedTypes = ['Text', 'Image', 'File', 'Object'];
