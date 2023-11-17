import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { EntityDesc } from '../types/EntityDesc';
import { Schema as UserEntityGrant } from './UserEntityGrant';
import { Schema as User } from './User';
import { Schema as Relation } from './Relation';
import { Schema as UserRelation } from './UserRelation';

export interface Schema extends EntityShape {
    ueg: UserEntityGrant;
    user: User;
    relation: Relation;
    claimEntityId: String<64>;
    userRelation: UserRelation;
};

const entityDesc: EntityDesc<Schema, ''> = {
    locales: {
        zh_CN: {
            name: '用户授权领取',
            attr: {
                ueg: '授权',
                user: '用户',
                relation: '关系',
                claimEntityId: '对象Id',
                userRelation: '用户关系',
            },
        },
    },
};