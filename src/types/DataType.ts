import { Geo, SingleGeo } from "./Geo";

export type Int<L extends 1 | 2 | 4 | 8> = number;
export type Uint<L extends 1 | 2 | 4 | 8> = number;
export type Double<P extends number, S extends number> = number;
export type Float<P extends number, S extends number> = number;
export type Decimal<P extends number, S extends number> = number;
export type String<L extends number> = string;
export type Text = string;
export type Image = string;
export type File = string;
export type Datetime = number | Date;
export type Day = number | Date;
export type Time = number | Date;
export type Boolean = boolean;
export type Price = number;
export type PrimaryKey = string;
export type ForeignKey<E extends string> = string;
export type Sequence = string;      // 自增长序列，为了让人阅读方便，为了支持分布式这里用string，底层实现可自定义
export { Geo, SingleGeo } from './Geo';

export type DataTypes = number | string | Datetime | Day | Time | Geo | Object | SingleGeo;

export const types = ['Int', 'Uint', 'Double', 'Float', 'String', 'Text', 'Datetime', 'Day', 'Time',
    'Boolean', 'Image', 'File', 'Geo', 'SingleGeo', 'Price', 'Decimal'];
export const unIndexedTypes = ['Text', 'Image', 'File', 'Object'];

export type JsonProjection<O extends object> = {
    [k in keyof O]?: NonNullable<O[k]> extends object ? JsonProjection<NonNullable<O[k]>> | number : number;
};
