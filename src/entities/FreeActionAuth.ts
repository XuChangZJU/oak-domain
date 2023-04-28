import { String } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { Index } from '../types/Storage';

type Actions = string[];

export interface Schema extends EntityShape {
    destEntity: String<32>;
    deActions: Actions;
};


const indexes: Index<Schema>[] = [
    {
        name: 'index_entity',
        attributes: [
            {
                name: 'destEntity',
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
        name: '自由对象访问授权',
        attr: {
            destEntity: '目标对象',
            deActions: '目标对象动作',
        },
    },
};
