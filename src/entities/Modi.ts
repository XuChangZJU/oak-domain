import { ActionDef } from '../types/Action';
import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
import { EntityDesc } from '../types/EntityDesc';

export interface Schema extends EntityShape {
    targetEntity: String<32>;       // 要操作的目标对象
    entity: String<32>;             // 关联的目标对象
    entityId: String<64>;           // 关联的目标对象id
    action: String<24>;
    data: Object;
    filter?: Object;
    extra?: Object;
};

type IState = 'active' | 'applied' | 'abandoned';
type IAction = 'apply' | 'abandon';

const IActionDef: ActionDef<IAction, IState> = {
    stm: {
        apply: ['active', 'applied'],
        abandon: ['active', 'abandoned'],
    },
    is: 'active',
};

type Action = IAction;

const entityDesc: EntityDesc<Schema, Action, '', {
    iState: IState,
}> = {
    locales: {
        zh_CN: {
            name: '更新',
            attr: {
                targetEntity: '目标对象',
                entity: '关联对象',
                entityId: '关联对象Id',
                action: '动作',
                data: '数据',
                filter: '条件',
                extra: '其它',
                iState: '状态',
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
    },
    indexes: [
        {
            name: 'index_state',
            attributes: [
                {
                    name: 'iState',
                    direction: 'ASC',
                }
            ],
        },
    ],
};
