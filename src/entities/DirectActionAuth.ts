import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';

type Actions = string[];

export interface Schema extends EntityShape {
    sourceEntity: String<32>;
    path: String<256>;
    destEntity: String<32>;
    deActions: Actions;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_entity_root_path',
        attributes: [
            {
                name: 'destEntity',
            },
            {
                name: 'sourceEntity',
            },
            {
                name: 'path',
            },
        ],
        config: {
            unique: true,
        },
    },
];

const locale: LocaleDef<
    Schema,
    '',
    '',
    {}
> = {
    zh_CN: {
        name: '直接对象访问授权',
        attr: {
            sourceEntity: '源对象',
            path: '路径',
            destEntity: '目标对象',
            deActions: '目标对象动作',
        },
    },
};
