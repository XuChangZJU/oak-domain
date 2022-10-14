import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { UniversalContext } from '../store/UniversalContext';
import { OpSchema as Modi, Filter } from '../base-app-domain/Modi/Schema';
import { Checker, Operation, StorageSchema, UpdateChecker, EntityDict, OakRowLockedException, Context, OperateOption, Trigger, RemoveTrigger } from '../types';
import { appendOnlyActions } from '../actions/action';
import { difference } from '../utils/lodash';

export function createOperationsFromModies(modies: Modi[]): Array<{
    operation: Operation<string, Object, Object>,
    entity: string,
}> {
    return modies.map(
        (modi) => {
            return {
                entity: modi.targetEntity,
                operation: {
                    id: modi.id,
                    action: modi.action,
                    data: modi.data,
                    filter: modi.filter as any,
                }
            }
        }
    );
}

export async function applyModis<ED extends EntityDict & BaseEntityDict, Cxt extends UniversalContext<ED>, Op extends OperateOption>(filter: ED['modi']['Selection']['filter'], context: Cxt, option: Op) {
    const { result: modis } = await context.rowStore.select('modi', {
        data: {
            id: 1,
        },
        filter,
        sorter: [
            {
                $attr: {
                    $$createAt$$: 1,
                },
                $direction: 'asc',
            }
        ]
    }, context, Object.assign({}, option, {
        blockTrigger: false,
    }));

    return context.rowStore.operate('modi', {
        id: await generateNewId(),
        action: 'apply',
        data: {},
        filter: {
            id: {
                $in: modis.map(ele => ele.id),
            }
        },
        sorter: [
            {
                $attr: {
                    $$createAt$$: 1,
                },
                $direction: 'asc',
            }
        ]
    }, context, Object.assign({}, option, {
        blockTrigger: false,
    }));
}

export async function abandonModis<ED extends EntityDict & BaseEntityDict, Cxt extends UniversalContext<ED>, Op extends OperateOption>(filter: ED['modi']['Selection']['filter'], context: Cxt, option: Op) {
    return context.rowStore.operate('modi', {
        id: await generateNewId(),
        action: 'abandon',
        data: {},
        filter,
        sorter: [
            {
                $attr: {
                    $$createAt$$: 1,
                },
                $direction: 'asc',
            }
        ]
    }, context,  Object.assign({}, option, {
        blockTrigger: false,
    }));
}

export function createModiRelatedCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        const { actionType, actions, inModi } = schema[entity];
        if (!inModi || ['readOnly', 'appendOnly'].includes(actionType)) {
            continue;
        }
        const restActions = difference(actions, appendOnlyActions);
        checkers.push({
            entity,
            action: restActions as any,
            type: 'row',
            checker: async ({ operation }, context) => {
                const { filter } = operation;
                const filter2 = {
                    modi: {
                        iState: 'active',
                    },
                };
                if (filter) {
                    Object.assign(filter2, {
                        [entity]: filter
                    });
                }
                else {
                    Object.assign(filter2, {
                        entity,
                    });
                }
                const count = await context.rowStore.count(
                    'modiEntity',
                    {
                        filter: filter2 as any,
                    },
                    context,
                    {}
                );
                if (count > 0) {
                    throw new OakRowLockedException();
                }
                return 0;
            },
        } as UpdateChecker<ED, keyof ED, Cxt>)
    }

    return checkers;
}

export function createModiRelatedTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>) {
    const triggers: Trigger<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        const { inModi } = schema[entity];
        if (inModi) {
            // 当关联modi的对象被删除时，对应的modi也删除
            triggers.push({
                name: `当删除${entity}对象时，删除相关联还活跃的modi`,
                action: 'remove',
                entity,
                when: 'after',
                fn: async ({ operation }, context, option) => {
                    const { data } = operation;
                    const { id } = data;
                    await context.rowStore.operate('modi', {
                        id: await generateNewId(),
                        action: 'remove',
                        data: {},
                        filter: {
                            entity,
                            entityId: id,
                        }
                    }, context, option);
                    return 1;
                },
            } as RemoveTrigger<ED, keyof ED, Cxt>);
        }
    }

    return triggers;
}

