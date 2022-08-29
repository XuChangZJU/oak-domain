import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { EntityShape, ActionType } from '../types/Entity';
import { LocaleDef } from '../types/Locale';
import { Schema as User } from './User';

export interface Schema extends EntityShape {
    action: String<16>;
    data: Object;
    filter?: Object;
    extra?: Object;
    operator?: User;
};

const actionType: ActionType = 'appendOnly';

const locale: LocaleDef<Schema, '', '', {}> = {
    zh_CN: {
        attr: {
            action: '动作',
            data: '数据',
            filter: '选择条件',
            extra: '其它',
            operator: '操作者',
        },
    },
};
