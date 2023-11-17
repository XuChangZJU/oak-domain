import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as Modi } from './Modi';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    modi: Modi,
    entity: String<32>;
    entityId: String<64>;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '更新对象连接',
            attr: {
                modi: '更新',
                entity: '关联对象',
                entityId: '关联对象id',
            },
        },
    },
    configuration: {
        actionType: 'appendOnly',
    }
};
