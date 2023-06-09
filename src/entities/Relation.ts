import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    entity: String<32>;
    entityId?: String<64>;        // 可以为空
    name?: String<32>;
    display?: String<32>;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                name: '关系',
                entity: '目标对象',
                entityId: '目标对象id',
                display: '显示值',
            },
        },
    },
    indexes: [
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
    ]
};
