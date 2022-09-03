import { combineFilters, contains } from "./filter";
import { ActionDictOfEntityDict, Checker, Context, CreateTriggerInTxn, DeduceFilter, EntityDict, OakRowInconsistencyException, StorageSchema, Trigger, UpdateChecker, UpdateTriggerInTxn, Watcher } from "../types";

export function getFullProjection<ED extends EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>) {
    const { attributes } = schema[entity];
    const projection: ED[T]['Selection']['data'] = {
        id: 1,
        $$createAt$$: 1,
        $$updateAt$$: 1,
        $$deleteAt$$: 1,
    };
    Object.keys(attributes).forEach(
        (k) => Object.assign(projection, {
            [k]: 1,
        })
    );

    return projection;
}

export async function checkFilterContains<ED extends EntityDict, T extends keyof ED, Cxt extends Context<ED>>(
    entity: T,
    schema: StorageSchema<ED>,
    contained: DeduceFilter<ED[T]['Schema']>,
    context: Cxt,
    filter?: DeduceFilter<ED[T]['Schema']>) {

    if (!filter) {
        throw new OakRowInconsistencyException();
    }
    // 优先判断两个条件是否相容
    if (contains(entity, schema, filter, contained)) {
        return;
    }
    // 再判断加上了conditionalFilter后取得的行数是否缩减
    const { rowStore } = context;
    const filter2 = combineFilters([filter, {
        $not: contained,
    }]);
    const { result } = await rowStore.select(entity, {
        data: getFullProjection(entity, schema) as any,
        filter: filter2,
        indexFrom: 0,
        count: 10,
    }, context, {
        dontCollect: true,
    });
    if (result.length > 0) {
        const data = {};
        result.forEach(
            ele => Object.assign(data, {
                [ele.id as string]: ele,
            })
        );
        throw new OakRowInconsistencyException({
            a: 's',
            d: {
                [entity]: data,
            }
        });
    }
}

function makeIntrinsicWatchers<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>) {
    const watchers: Watcher<ED, keyof ED, Cxt>[] = [];
    for (const entity in schema) {
        const { attributes } = schema[entity];

        const now = Date.now();
        const { expiresAt, expired } = attributes;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity,
                name: `对象${entity}上的过期自动watcher`,
                filter: async () => {
                    return {
                        expired: false,
                        expiresAt: {
                            $lte: now,
                        },
                    };
                },
                action: 'update',
                actionData: {
                    expired: true,
                } as ED[keyof ED]['Update']['data'],
            })
        }
    }

    return watchers;
}

export function analyzeActionDefDict<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>) {
    const checkers: Array<Checker<ED, keyof ED, Cxt>> = [];
    const triggers: Array<Trigger<ED, keyof ED, Cxt>> = [];
    for (const entity in actionDefDict) {
        for (const attr in actionDefDict[entity]) {
            const def = actionDefDict[entity]![attr];
            const { stm, is } = def!;
            for (const action in stm) {
                const actionStm = stm[action]!;
                checkers.push({
                    action: action as any,
                    type: 'row',
                    entity,
                    checker: async ({ operation }, context) => {
                        const { filter } = operation;
                        const conditionalFilter = typeof actionStm[0] === 'string' ? {
                            [attr]: actionStm[0],
                        } : {
                            [attr]: {
                                $in: actionStm[0],
                            },
                        };

                        await checkFilterContains(entity, schema, conditionalFilter as any, context, filter);
                        return 0;
                    }
                } as UpdateChecker<ED, keyof ED, Cxt>);
                triggers.push({
                    name: `set next state of ${attr} for ${entity} on action ${action}`,
                    action: action as any,
                    entity,
                    when: 'before',
                    fn: async ({ operation }) => {
                        const { data = {} } = operation;
                        Object.assign(operation, {
                            data: Object.assign(data, {
                                [attr]: stm[action][1],
                            }),
                        });
                        return 1;
                    }
                } as UpdateTriggerInTxn<ED, any, Cxt>)
            }

            if (is) {
                triggers.push({
                    name: `set initial state of ${attr} for ${entity} on create`,
                    action: 'create',
                    entity,
                    when: 'before',
                    fn: async ({ operation }) => {
                        const { data } = operation;
                        if (data instanceof Array) {
                            data.forEach(
                                ele => {
                                    if (!ele[attr]) {
                                        Object.assign(ele, {
                                            [attr]: is,
                                        });
                                    }
                                }
                            );
                            return data.length;
                        }
                        else {
                            if (!data[attr]) {
                                Object.assign(data, {
                                    [attr]: is,
                                });
                            }
                            return 1;
                        }
                    }
                } as CreateTriggerInTxn<ED, any, Cxt>);
            }
        }
    }

    return {
        triggers,
        checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}