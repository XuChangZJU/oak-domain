import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';

export interface Schema extends EntityShape {
    entity: String<32>;
    entityId?: String<64>;        // 可以为空
    name?: String<32>;
    display?: String<32>;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_targetEntity_entityId_name',
        attributes: [
            {
                name: 'entity',
            },
            {
                name: 'entityId',
            },
            {
                name: 'name',
            }
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
            name: '关系',
            entity: '目标对象',
            entityId: '目标对象id',
            display: '显示值',
        },
    },
};
