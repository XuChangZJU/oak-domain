import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    module: String<64>;
    position: String<256>;
    languange: String<32>;
    data: Object;
};

const entityDesc: EntityDesc<Schema> = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                module: '模块',
                position: '文件位置',
                languange: '语言',
                data: '数据'
            },
        },
    },
};
