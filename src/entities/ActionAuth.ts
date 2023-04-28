import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';
import { Schema as Relation } from './Relation';

type Actions = string[];

export interface Schema extends EntityShape {
    relation: Relation;
    path: String<256>;
    destEntity: String<32>;
    deActions: Actions;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_entity_relation_path',
        attributes: [
            {
                name: 'destEntity',
            },
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
            deActions: '目标对象动作',
        },
    },
};
