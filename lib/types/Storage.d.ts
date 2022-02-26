import { DataType, DataTypeParams } from './schema/DataTypes';
export declare type Ref = 'ref';
export interface Column {
    name: string;
    size?: number;
    direction?: 'ASC' | 'DESC';
}
export interface IndexConfig {
    unique?: boolean;
    type?: 'fulltext' | 'btree' | 'hash' | 'spatial';
    parser?: 'ngram';
}
export interface Index {
    name: string;
    attributes: Column[];
    config?: IndexConfig;
}
export interface Attribute {
    type: DataType | Ref;
    params?: DataTypeParams;
    ref?: string;
    onRefDelete?: 'delete' | 'setNull' | 'ignore';
    default?: string | number | boolean;
    notNull?: boolean;
}
export interface Attributes {
    [attrName: string]: Attribute;
}
export interface EntityConfig {
}
export declare type UniqConstraint = {
    attributes: string[];
    type?: string;
};
export interface StorageDesc {
    storageName?: string;
    comment?: string;
    attributes: Attributes;
    uniqueConstraints?: UniqConstraint[];
    indexes?: Index[];
    config?: EntityConfig;
    view?: true;
}
export interface StorageSchema {
    [Name: string]: StorageDesc;
}
