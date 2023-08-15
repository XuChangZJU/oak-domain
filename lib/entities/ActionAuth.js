"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var entityDesc = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                relation: '关系',
                paths: '路径',
                destEntity: '目标对象',
                deActions: '目标对象动作',
            },
        },
    },
    indexes: [
        {
            name: 'index_entity_relation',
            attributes: [
                {
                    name: 'destEntity',
                },
                {
                    name: 'relation',
                },
            ],
        },
    ],
};
