"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var indexes = [
    {
        name: 'index_user_relation',
        attributes: [
            {
                name: 'user',
            },
            {
                name: 'relation',
            },
        ],
        config: {
            unique: true,
        },
    },
];
var locale = {
    zh_CN: {
        name: '用户对象关系',
        attr: {
            user: '关系',
            relation: '目标关系',
        },
    },
};
