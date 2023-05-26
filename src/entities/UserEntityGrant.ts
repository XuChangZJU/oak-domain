import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Schema as Relation } from './Relation';

export interface Schema extends EntityShape {
    entity: String<32>;
    entityId: String<64>;
    relation: Relation;
};

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
            entity: '关联对象',
            entityId: '关联对象id',
        },
    },
};
