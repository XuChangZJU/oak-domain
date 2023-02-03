import { String, Int, Text, Image, Datetime } from '../types/DataType';
import { LocaleDef } from '../types/Locale';
import { EntityShape } from '../types/Entity';
import { ActionDef } from '../types/Action';

export interface Schema extends EntityShape {
    name?: String<16>;
    nickname?: String<64>;
    password?: Text;
    ref?: Schema;
};

type UserAction = 'mergeTo';
type UserState = 'normal' | 'merged';

type Action = UserAction;

const UserActionDef: ActionDef<UserAction, UserState> = {
    stm: {
        mergeTo: ['normal', 'merged'],
    },
};

const locale: LocaleDef<Schema, Action, '', {
    userState: UserState;
}> = {
    zh_CN: {
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
};