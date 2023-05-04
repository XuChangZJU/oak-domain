import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';
import { Schema as Relation } from './Relation';

// destRelation需要有path指定的user关系才能授权/除权
export interface Schema extends EntityShape {
    path: String<256>;
    destRelation: Relation;
};

const indexes: Index<Schema>[] = [
    {
        name: 'index_entity_relation_path',
        attributes: [
            {
                name: 'path',
            },
            {
                name: 'destRelation',
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
            path: '路径',
            destRelation: '目标关系',
        },
    },
};
