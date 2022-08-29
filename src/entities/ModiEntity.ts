import { String } from '../types/DataType';
import { EntityShape, ActionType } from '../types/Entity';
import { LocaleDef } from '../types/Locale';
import { Schema as Modi } from './Modi';

export interface Schema extends EntityShape {
    modi: Modi,
    entity: String<32>;
    entityId: String<64>;
};

const actionType: ActionType = 'appendOnly';

const locale: LocaleDef<Schema, '', '', {}> = {
    zh_CN: {
        attr: {
            modi: '更新',
            entity: '关联对象',
            entityId: '关联对象id',
        },
    },
};
