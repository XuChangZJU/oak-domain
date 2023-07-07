import { Geo, SingleGeo } from "./Geo";
export declare type Int<L extends 1 | 2 | 4 | 8> = number;
export declare type Uint<L extends 1 | 2 | 4 | 8> = number;
export declare type Double<P extends number, S extends number> = number;
export declare type Float<P extends number, S extends number> = number;
export declare type String<L extends number> = string;
export declare type Text = string;
export declare type Image = string;
export declare type File = string;
export declare type Datetime = number | Date;
export declare type Day = number | Date;
export declare type Time = number | Date;
export declare type Boolean = boolean;
export declare type Price = number;
export declare type PrimaryKey = string;
export declare type ForeignKey<E extends string> = string;
export declare type Sequence = string;
export { Geo, SingleGeo } from './Geo';
export declare type DataTypes = number | string | Datetime | Day | Time | Geo | Object | SingleGeo;
export declare const types: string[];
export declare const unIndexedTypes: string[];
