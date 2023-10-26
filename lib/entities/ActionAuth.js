"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
const entityDesc = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                relation: '关系',
                path: '路径',
                deActions: '目标对象动作',
            },
        },
    },
    indexes: [
        {
            name: 'index_relation_path',
            attributes: [
                {
                    name: 'relation',
                },
                {
                    name: 'path',
                }
            ],
            config: {
                unique: true,
            },
        },
    ],
};
