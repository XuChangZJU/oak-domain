"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
var IActionDef = {
    stm: {
        apply: ['active', 'applied'],
        abandon: ['active', 'abandoned'],
    },
    is: 'active',
};
var indexes = [
    {
        name: 'index_state',
        attributes: [
            {
                name: 'iState',
                direction: 'ASC',
            }
        ],
    },
];
var locale = {
    zh_CN: {
        attr: {
            action: '动作',
            data: '数据',
            filter: '条件',
            extra: '其它',
            iState: '状态',
            parent: '关联父更新'
        },
        action: {
            abandon: '放弃',
            apply: '应用',
        },
        v: {
            iState: {
                active: '活跃的',
                abandoned: '放弃的',
                applied: '应用的',
            },
        },
    },
};
