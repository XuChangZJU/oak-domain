import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { OpSchema as Modi, Filter } from '../base-app-domain/Modi/Schema';
import { Checker, Operation, StorageSchema, RowChecker, EntityDict, OakRowLockedException, Context, OperateOption, Trigger, RemoveTrigger } from '../types';
import { appendOnlyActions } from '../actions/action';
import { difference } from '../utils/lodash';
import { AsyncContext } from './AsyncRowStore';
import { generateNewIdAsync } from "../utils/uuid";
import { SyncContext } from './SyncRowStore';

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

export async function applyModis<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, Op extends OperateOption>(filter: ED['modi']['Selection']['filter'], context: Cxt, option: Op) {
    return context.operate('modi', {
        id: await generateNewIdAsync(),
        action: 'apply',
        data: {},
        filter,
        /* sorter: [
            {
                $attr: {
                    $$createAt$$: 1,
                },
                $direction: 'asc',
            }
        ] */
    }, Object.assign({}, option, {
        blockTrigger: false,
    }));
}

export async function abandonModis<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, Op extends OperateOption>(filter: ED['modi']['Selection']['filter'], context: Cxt, option: Op) {
    return context.operate('modi', {
        id: await generateNewIdAsync(),
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
    }, Object.assign({}, option, {
        blockTrigger: false,
    }));
}

export function createModiRelatedCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    const checkers: RowChecker<ED, keyof ED, Cxt>[] = [];

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
            filter: {
                id: {
                    $nin: {
                        entity: 'modiEntity',
                        data: {
                            entityId: 1,
                        },
                        filter: {
                            entity,
                            modi: {
                                iState: 'active',
                            }
                        },
                    },
                },
            } as ED[keyof ED]['Selection']['filter'],
            errMsg: `更新的对象${entity}上有尚未结束的modi`,
        })
    }

    return checkers;
}

export function createModiRelatedTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(schema: StorageSchema<ED>) {
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
                    await context.operate('modi', {
                        id: await generateNewIdAsync(),
                        action: 'remove',
                        data: {},
                        filter: {
                            entity,
                            entityId: id,
                        }
                    }, option);
                    return 1;
                },
            } as RemoveTrigger<ED, keyof ED, Cxt>);
        }
    }

    return triggers;
}

