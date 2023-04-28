"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var indexes = [
    {
        name: 'index_user_entity_entityId_relation',
        attributes: [
            {
                name: 'user',
            },
            {
                name: 'entity',
            },
            {
                name: 'entityId',
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
            entity: '目标对象',
            entityId: '目标对象ID',
        },
    },
};
