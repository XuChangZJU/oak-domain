import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';
import { Schema as User } from './User';
import { Schema as Relation } from './Relation';

export interface Schema extends EntityShape {
    user: User;
    relation: Relation;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_user_relation',
        attributes: [
            {
                name: 'user',
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
        },
    },
};
