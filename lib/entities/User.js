"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityDesc = exports.UserActionDef = void 0;
;
exports.UserActionDef = {
    stm: {
        mergeTo: ['normal', 'merged'],
    },
};
exports.entityDesc = {
    locales: {
        zh_CN: {
            name: '用户',
            attr: {
                name: '姓名',
                nickname: '昵称',
                password: '密码',
                ref: '指向用户',
                userState: '状态',
            },
            action: {
                mergeTo: '合并',
            },
            v: {
                userState: {
                    normal: '正常',
                    merged: '已被合并',
                },
            }
        },
    },
};
