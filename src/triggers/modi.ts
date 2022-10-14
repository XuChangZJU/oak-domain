import { EntityDict } from "../base-app-domain";
import { Trigger } from "../types";
import { UniversalContext } from "../store/UniversalContext";

const triggers: Trigger<EntityDict, 'modi', UniversalContext<EntityDict>>[] = [
    {
        name: '当modi被应用时，将相应的operate完成',
        entity: 'modi',
        action: 'apply',
        when: 'after',
        fn: async ({ operation }, context, option) => {
            const { filter } = operation;
            const { result: modies } = await context.rowStore.select('modi', {
                data: {
                    id: 1,
                    action: 1,
                    data: 1,
                    filter: 1,
                    targetEntity: 1,
                },
                filter,
            }, context, option);

            for (const modi of modies) {
                const { targetEntity, id, action, data, filter} = modi;
                const targets = await context.rowStore.select(targetEntity as keyof EntityDict, {
                    data: {
                        id: 1,
                    },
                    filter: filter as any,
                }, context, Object.assign({}, option, {
                    blockTrigger: true,                    
                }));
                await context.rowStore.operate(targetEntity as keyof EntityDict, {
                    id,
                    action,
                    data,
                    filter: targets.result.map(ele => ele.id),
                }, context, Object.assign({}, option, {
                    blockTrigger: true,
                }));
            }

            return modies.length;
        }
    }
];

export default triggers;