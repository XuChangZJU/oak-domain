import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
import { EntityDesc } from '../types/EntityDesc';

type Actions = string[];
type Paths = string[];

export interface Schema extends EntityShape {
    relation?: Relation;
    paths: Paths;
    destEntity: String<32>;
    deActions: Actions;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                relation: '关系',
                paths: '路径',
                destEntity: '目标对象',
                deActions: '目标对象动作',
            },
        },
    },
    indexes: [
        {
            name: 'index_entity_relation',
            attributes: [
                {
                    name: 'destEntity',
                },
                {
                    name: 'relation',
                },
            ],
        },
    ],
};
