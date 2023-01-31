import { EntityDict } from "../base-app-domain";
import { AsyncContext } from "../store/AsyncRowStore";
import { Trigger, UpdateTrigger } from "../types";

const triggers: Trigger<EntityDict, 'modi', AsyncContext<EntityDict>>[] = [
    {
        name: '当modi被应用时，将相应的operate完成',
        entity: 'modi',
        action: 'apply',
        when: 'after',
        fn: async ({ operation }, context, option) => {
            const { filter } = operation;
            const modies = await context.select('modi', {
                data: {
                    id: 1,
                    action: 1,
                    data: 1,
                    filter: 1,
                    targetEntity: 1,
                },
                filter,
            }, option);

            for (const modi of modies) {
                const { targetEntity, id, action, data, filter} = modi;
                await context.operate(targetEntity as keyof EntityDict, {
                    id: id!,
                    action: action as EntityDict[keyof EntityDict]['Action'],
                    data: data as EntityDict[keyof EntityDict]['Update']['data'],
                    filter: filter as EntityDict[keyof EntityDict]['Update']['filter'],
                }, Object.assign({}, option, {
                    blockTrigger: true,
                }));
            }

            return modies.length;
        }
    }
];

export default triggers;