import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';
import { Schema as Relation } from './Relation';

type Relations = string[];

export interface Schema extends EntityShape {
    relation: Relation;
    path: String<256>;
    destEntity: String<32>;
    deRelations: Relations;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_relation_path',
        attributes: [
            {
                name: 'relation',
            },
            {
                name: 'path',
            },
        ],
        config: {
            unique: true,
        },
    },
];

const locale: LocaleDef<
    Schema,
    '',
    '',
    {}
> = {
    zh_CN: {
        name: '用户授权',
        attr: {
            relation: '关系',
            path: '路径',
            destEntity: '目标对象',
            deRelations: '目标对象关系',
        },
    },
};
