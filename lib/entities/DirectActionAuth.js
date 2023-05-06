"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var indexes = [
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
var locale = {
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
