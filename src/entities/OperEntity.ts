import { String } from '../types/DataType';
import { EntityShape, Configuration } from '../types/Entity';
import { LocaleDef } from '../types/Locale';
import { Schema as Oper } from './Oper';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    oper: Oper,
    entity: String<32>;
    entityId: String<64>;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '操作对象连接',
            attr: {
                oper: '操作',
                entity: '关联对象',
                entityId: '关联对象id',
            },
        },
    },
    configuration: {
        actionType: 'appendOnly',
    }
};
