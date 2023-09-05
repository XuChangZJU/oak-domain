"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
const entityDesc = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                name: '关系',
                entity: '目标对象',
                entityId: '目标对象id',
                display: '显示值',
            },
        },
    },
    indexes: [
        {
            name: 'index_targetEntity_entityId_name',
            attributes: [
                {
                    name: 'entity',
                },
                {
                    name: 'entityId',
                },
                {
                    name: 'name',
                }
            ],
            config: {
                unique: true,
            },
        },
    ]
};
