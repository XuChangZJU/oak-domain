import { Geo } from "./Geo";

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

export type DataTypes = number | string | Datetime | Geo | object;

export const types = ['Int', 'Uint', 'Double', 'Float', 'String', 'Text', 'Datetime', 'Boolean', 'Image', 'File', 'Geo'];
export const unIndexedTypes = ['Text', 'Image', 'File', 'Object'];
