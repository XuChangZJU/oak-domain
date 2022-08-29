import { ActionType } from '.';
import { EntityDict, EntityShape, InstinctiveAttributes } from './Entity';
import { DataType, DataTypeParams } from './schema/DataTypes';

export type Ref = 'ref';


export interface Column<SH extends EntityShape> {
    name: keyof SH | `${string}State`;
    size?: number,
    direction?: 'ASC' | 'DESC',
}

export interface IndexConfig {
    unique?: boolean;
    type?: 'fulltext'|'btree'|'hash'|'spatial';
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
}

export type Attributes<SH extends EntityShape> = Omit<{
    [attrName in keyof SH]: Attribute;
}, InstinctiveAttributes>;

export interface EntityConfig {
}

export type UniqConstraint<SH extends EntityShape> = {
    attributes: Array<keyof SH>;
    type?: string;
};

export interface StorageDesc<SH extends EntityShape> {
    storageName?: string,
    comment?: string,
    attributes: Attributes<SH>;
    uniqueConstraints?: UniqConstraint<SH>[];
    indexes?: Index<SH>[];
    config?: EntityConfig;
    toModi?: true;          // 标识一下是否关联在modi上
    actions: string[];
    actionType: ActionType;
    // view 相关
    view?: true;
}


export type StorageSchema<ED extends EntityDict> = {
    [K in keyof ED]: StorageDesc<ED[K]['OpSchema']>;
}
