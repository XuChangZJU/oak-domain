"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var indexes = [
    {
        name: 'index_entity_relation_path',
        attributes: [
            {
                name: 'destEntity',
            },
            {
                name: 'relation',
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
var locale = {
    zh_CN: {
        name: '用户授权',
        attr: {
            relation: '关系',
            path: '路径',
            destEntity: '目标对象',
            deActions: '目标对象动作',
        },
    },
};
