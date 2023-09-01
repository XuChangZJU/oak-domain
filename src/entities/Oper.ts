import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { Schema as User } from './User';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    action: String<16>;
    data: Object;
    filter?: Object;
    extra?: Object;
    operator?: User;
    targetEntity: String<32>;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '操作',
            attr: {
                action: '动作',
                data: '数据',
                filter: '选择条件',
                extra: '其它',
                operator: '操作者',
                targetEntity: '关联对象',
            },
        },
    },
    configuration: {
        actionType: 'appendOnly',
    }
};
