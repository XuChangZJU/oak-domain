import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';
import { Schema as User } from './User';
import { Schema as Relation } from './Relation';

export interface Schema extends EntityShape {
    user: User;
    relation: Relation;
    entity: String<32>;
    entityId: String<64>;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_user_entity_entityId_relation',
        attributes: [
            {
                name: 'user',
            },
            {
                name: 'entity',
            },
            {
                name: 'entityId',
            },
            {
                name: 'relation',
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
        name: '用户对象关系',
        attr: {
            user: '关系',
            relation: '目标关系',
            entity: '目标对象',
            entityId: '目标对象ID',
        },
    },
};
