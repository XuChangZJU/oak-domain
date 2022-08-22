import { String, Int, Text, Image, Datetime } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';

export interface Schema extends EntityShape {
    name?: String<16>;
    nickname?: String<64>;
    password?: Text;
};


const locale: LocaleDef<Schema, '', '', {}> = {
    zh_CN: {
        attr: {
            name: '姓名',
            nickname: '昵称',
            password: '密码',
        },
    },
};