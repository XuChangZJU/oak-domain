import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
import { EntityDesc } from '../types/EntityDesc';
import { Schema as Path } from './Path';

// destRelation需要有sourceRelation才能授权/除权
export interface Schema extends EntityShape {
    sourceRelation: Relation;
    path: Path;
    destRelation: Relation;
};

const entityDesc: EntityDesc<Schema> = {
    indexes: [
        {
            name: 'index_entity_relation_path',
            attributes: [
                {
                    name: 'sourceRelation',
                },
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
    ],
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                sourceRelation: '源关系',
                path: '路径',
                destRelation: '目标关系',
            },
        },
    }
};
