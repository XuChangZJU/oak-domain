import { String } from '../types/DataType';
import { EntityShape, Configuration } from '../types/Entity';
import { LocaleDef } from '../types/Locale';
import { Schema as Oper } from './Oper';

export interface Schema extends EntityShape {
    oper: Oper,
    targetEntityId: String<64>;
};

const config: Configuration = {
    actionType: 'appendOnly',
};

const locale: LocaleDef<Schema, '', '', {}> = {
    zh_CN: {
        name: '操作对象连接',
        attr: {
            oper: '操作',
            targetEntityId: '关联对象id',
        },
    },
};
