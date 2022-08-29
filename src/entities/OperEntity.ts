import { String } from '../types/DataType';
import { EntityShape, ActionType } from '../types/Entity';
import { LocaleDef } from '../types/Locale';
import { Schema as Oper } from './Oper';

export interface Schema extends EntityShape {
    oper: Oper,
    entity: String<32>;
    entityId: String<64>;
};

const actionType: ActionType = 'appendOnly';

const locale: LocaleDef<Schema, '', '', {}> = {
    zh_CN: {
        attr: {
            oper: '操作',
            entity: '关联对象',
            entityId: '关联对象id',
        },
    },
};
