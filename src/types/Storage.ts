import { EntityDef, EntityShape } from './Entity';
import { DataType, DataTypeParams } from './schema/DataTypes';
import { TriggerDataAttribute, TriggerTimestampAttribute } from './Trigger';
export type Ref = 'ref';

type PrimaryKeyAttribute = 'id';
type InstinctiveAttributes = PrimaryKeyAttribute | '$$createAt$$' | '$$updateAt$$' | '$$removeAt$$' | TriggerDataAttribute | TriggerTimestampAttribute;

export interface Column<SH extends EntityShape> {
    name: keyof SH,
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
    // view 相关
    view?: true;
}

type EntityDomain = {
    [K: string]: EntityDef;
};

export type StorageSchema<ED extends EntityDomain> = {
    [K in keyof ED]: StorageDesc<ED[K]['OpSchema']>;
}
