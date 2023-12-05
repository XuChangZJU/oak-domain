import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { EntityDesc } from '../types/EntityDesc';

type RelationIds = string[];

export interface Schema extends EntityShape {
    relationEntity: String<32>;
    relationEntityFilter: Object;
    relationIds: RelationIds;
};

const entityDesc: EntityDesc<Schema, ''> = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                relationIds: '关系',
                relationEntity: '关联对象',
                relationEntityFilter: '对象限定条件',
            },
        },
    },
};
