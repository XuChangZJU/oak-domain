import { ActionType } from '.';
import { EntityDict, EntityShape, InstinctiveAttributes, RelationHierarchy, CascadeRelationAuth } from './Entity';
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
    ref?: string | string[];
    onRefDelete?: 'delete' | 'setNull' | 'ignore';
    default?: string | number | boolean;
    notNull?: boolean;
    unique?: boolean;
    sequenceStart?: number;
    enumeration?: string[];
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
    toModi?: true;          // 标识是否有一对多的modi关联关系（业务层的申请）
    inModi?: true;          // 标识是否可能被modi所指向（编译器根据toModi对象进行的推断，主要用于对这些对象的update/remove时检查有无modi的存在）
    static?: true;          // 标识是维表（变动较小，相对独立）
    actions: string[];
    actionType: ActionType;
    // relationHierarchy?: RelationHierarchy<Relation>;
    // reverseCascadeRelationHierarchy?: ReverseCascadeRelationHierarchy<Relation>;
    relation?: string[];
    // view 相关
    view?: true;
    recursiveDepth?: number;
}


export type StorageSchema<ED extends EntityDict> = {
    [K in keyof ED]: StorageDesc<ED[K]['OpSchema']>;
}
