import { String, Int, Text, Image, Datetime } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { ActionDef } from '../types/Action';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    name?: String<16>;
    nickname?: String<64>;
    password?: Text;
    ref?: Schema;
};

type UserAction = 'mergeTo';
type UserState = 'normal' | 'merged';

export type Action = UserAction;


export const UserActionDef: ActionDef<UserAction, UserState> = {
    stm: {
        mergeTo: ['normal', 'merged'],
    },
};

export const entityDesc: EntityDesc<Schema, Action, '', {
    userState: UserState,
}> = {
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