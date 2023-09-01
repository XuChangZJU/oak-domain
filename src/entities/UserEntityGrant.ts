import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    entity: String<32>;
    entityId: String<64>;
    relation: Relation;
};
type Action = 'confirm';

const entityDesc: EntityDesc<Schema, Action> = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                relation: '关系',
                entity: '关联对象',
                entityId: '关联对象id',
            },
            action: {
                confirm: '领取',
            },
        },
    },
};
