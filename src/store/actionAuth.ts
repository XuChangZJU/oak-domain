import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { EntityDict } from '../types/Entity';
import { Trigger } from '../types';
import { generateNewIdAsync } from '../utils/uuid';
import { AsyncContext } from './AsyncRowStore';

export const triggers: Trigger<EntityDict, 'actionAuth', AsyncContext<EntityDict>>[] = [
    {
        name: '当actionAuth的deActions被置空后，删除此条数据',
        entity: 'actionAuth',
        action: 'update',
        fn: async ({ operation }, context, option) => {
            const { data, filter } = operation;
            if (data.deActions && data.deActions.length === 0) {
                await context.operate('actionAuth', {
                    id: await generateNewIdAsync(),
                    action: 'remove',
                    data: {},
                    filter,
                }, option);
                return 1;
            }

            return 0;
        },
        when: 'after',
    }
];