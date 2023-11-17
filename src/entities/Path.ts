import { String, Boolean, Text } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    destEntity: String<32>;
    value: String<256>;
    recursive: Boolean;
    sourceEntity: String<32>;
};

const entityDesc: EntityDesc<Schema> = {
    indexes: [
        {
            name: 'index_source_dest_path',
            attributes: [
                {
                    name: 'sourceEntity',
                },
                {
                    name: 'value',
                },
                {
                    name: 'destEntity',
                },
            ],
            config: {
                unique: true,
            },
        },
    ],
    locales: {
        zh_CN: {
            name: '关系路径',
            attr: {
                sourceEntity: '源对象',
                value: '路径（从dest到source）',
                destEntity: '目标对象',
                recursive: '是否递归（目标对象）',
            },
        },
    }
};
