"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
const entityDesc = {
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
