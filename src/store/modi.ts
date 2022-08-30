import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { UniversalContext } from '../store/UniversalContext';
import { OpSchema as Modi, Filter } from '../base-app-domain/Modi/Schema';
import { Checker, Operation, StorageSchema, UpdateChecker, EntityDict, OakRowLockedException, Context } from '../types';
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

export async function applyModis<ED extends EntityDict & BaseEntityDict, Cxt extends UniversalContext<ED>>(filter: ED['modi']['Selection']['filter'], context: Cxt) {
    return context.rowStore.operate('modi', {
        id: await generateNewId(),
        action: 'apply',
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
    }, context, {
        dontCollect: true,
        blockTrigger: true,
    });
}

export async function abandonModis<ED extends EntityDict & BaseEntityDict, Cxt extends UniversalContext<ED>>(filter: ED['modi']['Selection']['filter'], context: Cxt) {
    return context.rowStore.operate('modi', {
        id: await generateNewId(),
        action: 'abadon',
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
    }, context, {
        dontCollect: true,
        blockTrigger: true,
    });
}

export function createModiRelatedCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        const { actionType, actions } = schema[entity];
        if (['modi', 'modiEntity', 'oper', 'operEntity'].includes(entity) || ['readOnly', 'appendOnly'].includes(actionType)) {
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

export function getModiSubSelection() {
    return {
        data: {
            id: 1,
            targetEntity: 1,
            entity: 1,
            entityId: 1,
            action: 1,
            data: 1,
            filter: 1,
            iState: 1,
        },
        filter: {
            iState: 'active',
        },
    };
}
