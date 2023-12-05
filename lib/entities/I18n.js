"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
const entityDesc = {
    locales: {
        zh_CN: {
            name: '用户授权',
            attr: {
                module: '模块',
                position: '文件位置',
                namespace: '命名空间',
                language: '语言',
                data: '数据'
            },
        },
    },
    indexes: [
        {
            name: 'namespace_language',
            attributes: [
                {
                    name: 'namespace',
                },
                {
                    name: 'language',
                }
            ],
            config: {
                unique: true,
            },
        }
    ],
    configuration: {
        static: true,
    },
};
