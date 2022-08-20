import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { LocaleDef } from '../types/Locale';

export interface Schema extends EntityShape {
    action: String<16>;
    data: Object;
    filter?: Object;
    extra?: Object;
};

const locale: LocaleDef<Schema, '', '', {}> = {
    zh_CN: {
        attr: {
            action: '动作',
            data: '数据',
            filter: '选择条件',
            extra: '其它',
        },
    },
};
