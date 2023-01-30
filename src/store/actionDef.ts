import { ActionDictOfEntityDict, BBWatcher, Checker, EntityDict, StorageSchema, Trigger, RowChecker } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";

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

function makeIntrinsicWatchers<ED extends EntityDict>(schema: StorageSchema<ED>) {
    const watchers: BBWatcher<ED, keyof ED>[] = [];
    for (const entity in schema) {
        const { attributes } = schema[entity];

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
                            $lte: Date.now(),
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

export function analyzeActionDefDict<ED extends EntityDict, Cxt extends SyncContext<ED> | AsyncContext<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>) {
    const checkers: Array<Checker<ED, keyof ED, Cxt>> = [];
    const triggers: Array<Trigger<ED, keyof ED, Cxt>> = [];
    for (const entity in actionDefDict) {
        for (const attr in actionDefDict[entity]) {
            const def = actionDefDict[entity]![attr];
            const { stm, is } = def!;
            for (const action in stm) {
                const actionStm = stm[action]!;
                const conditionalFilter = typeof actionStm[0] === 'string' ? {
                    [attr]: actionStm[0],
                } : {
                    [attr]: {
                        $in: actionStm[0],
                    },
                };
                checkers.push({
                    action: action as any,
                    type: 'row',
                    entity,
                    filter: conditionalFilter,
                    errMsg: '',
                } as RowChecker<ED, keyof ED, Cxt>);
                checkers.push({
                    action: action as any,
                    type: 'data',
                    entity,
                    priority: 10,       // 优先级要高
                    checker: (data) => {
                        Object.assign(data, {
                            [attr]: stm[action][1],
                        });
                    }
                });
            }

            if (is) {
                checkers.push({
                    action: 'create' as any,
                    type: 'data',
                    entity,
                    priority: 10,       // 优先级要高
                    checker: (data) => {                       
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
                        }
                        else {
                            if (!(data as ED[keyof ED]['CreateSingle']['data'])[attr]) {
                                Object.assign(data, {
                                    [attr]: is,
                                });
                            }
                        }
                    }
                });
            }
        }
    }

    return {
        triggers,
        checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}