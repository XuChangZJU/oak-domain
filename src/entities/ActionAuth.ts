import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
import { EntityDesc } from '../types/EntityDesc';
import { Schema as Path } from './Path';

type Actions = string[];

export interface Schema extends EntityShape {
    relation?: Relation;
    path: Path;
    deActions: Actions;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                relation: '关系',
                path: '路径',
                deActions: '目标对象动作',
            },
        },
    },
    indexes: [
        {
            name: 'index_relation_path',
            attributes: [
                {
                    name: 'relation',
                },
                {
                    name: 'path',
                }
            ],
            config: {
                unique: true,
            },
        },
    ],
};
