import { ActionType } from '.';
import { EntityDict, EntityShape, InstinctiveAttributes } from './Entity';
import { DataType, DataTypeParams } from './schema/DataTypes';
export declare type Ref = 'ref';
export interface Column<SH extends EntityShape> {
    name: keyof SH | `${string}State`;
    size?: number;
    direction?: 'ASC' | 'DESC';
}
export interface IndexConfig {
    unique?: boolean;
    type?: 'fulltext' | 'btree' | 'hash' | 'spatial';
    parser?: 'ngram';
}
export interface Index<SH extends EntityShape> {
    name: string;
    attributes: Column<SH>[];
    config?: IndexConfig;
}
export interface Attribute {
    type: DataType | Ref;
    params?: DataTypeParams;
    ref?: string;
    onRefDelete?: 'delete' | 'setNull' | 'ignore';
    default?: string | number | boolean;
    notNull?: boolean;
    unique?: boolean;
    sequenceStart?: number;
}
export declare type Attributes<SH extends EntityShape> = Omit<{
    [attrName in keyof SH]: Attribute;
}, InstinctiveAttributes>;
export interface EntityConfig {
}
export declare type UniqConstraint<SH extends EntityShape> = {
    attributes: Array<keyof SH>;
    type?: string;
};
export interface StorageDesc<SH extends EntityShape> {
    storageName?: string;
    comment?: string;
    attributes: Attributes<SH>;
    uniqueConstraints?: UniqConstraint<SH>[];
    indexes?: Index<SH>[];
    config?: EntityConfig;
    toModi?: true;
    inModi?: true;
    static?: true;
    actions: string[];
    actionType: ActionType;
    view?: true;
}
export declare type StorageSchema<ED extends EntityDict> = {
    [K in keyof ED]: StorageDesc<ED[K]['OpSchema']>;
};
