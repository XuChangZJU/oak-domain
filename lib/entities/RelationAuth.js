"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var entityDesc = {
    indexes: [
        {
            name: 'index_entity_relation_path',
            attributes: [
                {
                    name: 'sourceRelation',
                },
                {
                    name: 'path',
                },
                {
                    name: 'destRelation',
                },
            ],
            config: {
                unique: true,
            },
        },
    ],
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                sourceRelation: '源关系',
                path: '路径',
                destRelation: '目标关系',
            },
        },
    }
};
