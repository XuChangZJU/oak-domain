import { ActionDictOfEntityDict, BBWatcher, Checker, EntityDict, StorageSchema, Trigger, RowChecker, OakDataException, OakUniqueViolationException, UpdateTrigger, CHECKER_MAX_PRIORITY } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { uniqBy, pick, intersection } from '../utils/lodash';
import { addFilterSegment } from "./filter";
import { createDynamicCheckers } from '../checkers';
import { createDynamicTriggers } from '../triggers';
import { EntityDict as BaseEntityDict } from '../base-app-domain/EntityDict';

export function getFullProjection<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>) {
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

function makeIntrinsicWatchers<ED extends EntityDict & BaseEntityDict>(schema: StorageSchema<ED>) {
    const watchers: BBWatcher<ED, keyof ED>[] = [];
    for (const entity in schema) {
        const { attributes } = schema[entity];

        const { expiresAt, expired } = attributes;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity,
                name: `对象${entity}上的过期自动watcher`,
                filter: () => {
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

function checkUniqueBetweenRows(rows: Record<string, any>[], uniqAttrs: string[]) {
    // 先检查这些行本身之间有无unique冲突
    const uniqRows = uniqBy(rows, (d) => {
        let s = '';
        for (const a of uniqAttrs) {
            if (d[a as string] === null || d[a as string] === undefined) {
                s + d.id;
            }
            else {
                s + `-${d[a as string]}`;
            }
        }
        return s;
    });
    if (uniqRows.length < rows.length) {
        throw new OakUniqueViolationException([{
            attrs: uniqAttrs,
        }]);
    }
}

function checkCountLessThan(count: number | Promise<number>, uniqAttrs: string[], than: number = 0, id?: string) {
    if (count instanceof Promise) {
        return count.then(
            (count2) => {
                if (count2 > than) {
                    throw new OakUniqueViolationException([{
                        id,
                        attrs: uniqAttrs,
                    }]);
                }
            }
        )
    }
    if (count > than) {
        throw new OakUniqueViolationException([{
            id,
            attrs: uniqAttrs,
        }]);
    }
}

function checkUnique<ED extends EntityDict& BaseEntityDict, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    entity: keyof ED,
    row: Record<string, any>,
    context: Cxt,
    uniqAttrs: string[],
    extraFilter?: ED[keyof ED]['Selection']['filter']
) {
    const filter = pick(row, uniqAttrs);
    for (const a in filter) {
        if (filter[a] === null || filter[a] === undefined) {
            delete filter[a];
        }
    }
    if (Object.keys(filter).length < uniqAttrs.length) {
        // 说明有null值，不需要检查约束
        return;
    }
    const filter2 = extraFilter ? addFilterSegment(filter, extraFilter) : filter;
    const count = context.count(entity, { filter: filter2 }, { dontCollect: true });
    return checkCountLessThan(count, uniqAttrs, 0, row.id)
}

export function makeIntrinsicCTWs<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>) {
    const checkers: Array<Checker<ED, keyof ED, Cxt | FrontCxt>> = createDynamicCheckers<ED, Cxt | FrontCxt>(schema);
    const triggers: Array<Trigger<ED, keyof ED, Cxt | FrontCxt>> = createDynamicTriggers<ED, Cxt | FrontCxt>(schema);

    // action状态转换矩阵相应的checker
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

                // 这里用data类型的checker改数据了不太好，先这样
                checkers.push({
                    action: action as any,
                    type: 'data',
                    entity,
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

    // unique索引相应的checker
    for (const entity in schema) {
        const { indexes } = schema[entity];
        if (indexes) {
            for (const index of indexes) {
                if (index.config?.unique) {
                    const { attributes } = index;
                    const uniqAttrs = attributes.map(ele => ele.name as string);
                    checkers.push({
                        entity,
                        action: 'create',
                        type: 'logical',
                        priority: CHECKER_MAX_PRIORITY,       // 优先级要放在最低，所有前置的checker/trigger将数据完整之后再在这里检测
                        checker: (operation, context) => {
                            const { data } = operation;
                            
                            if (data instanceof Array) {
                                checkUniqueBetweenRows(data, uniqAttrs);
                                const checkResult = data.map(
                                    ele => checkUnique<ED, Cxt | FrontCxt>(entity, ele, context, uniqAttrs)
                                );
                                if (checkResult[0] instanceof Promise) {
                                    return Promise.all(checkResult).then(
                                        () => undefined
                                    );
                                }
                            }
                            else {
                                return checkUnique<ED, Cxt | FrontCxt>(entity, data, context, uniqAttrs);
                            }
                        }
                    }, {
                        entity,
                        action: 'update',       // 只检查update，其它状态转换的action应该不会涉及unique约束的属性
                        type: 'logical',
                        priority: CHECKER_MAX_PRIORITY,       // 优先级要放在最低，所有前置的checker/trigger将数据完整之后再在这里检测
                        checker: (operation, context) => {
                            const { data, filter: operationFilter } = operation as ED[keyof ED]['Update'];
                            const attrs = Object.keys(data);

                            const refAttrs = intersection(attrs, uniqAttrs);
                            if (refAttrs.length === 0) {
                                // 如果本次更新和unique约束的属性之间没有交集则直接返回
                                return;
                            }
                            for (const attr of refAttrs) {
                                // 如果有更新为null值，不用再检查约束
                                if (data[attr as string] === null || data[attr as string] === undefined) {
                                    return;
                                }
                            }
                            if (refAttrs.length === uniqAttrs.length) {
                                // 如果更新了全部属性，直接检查
                                const filter = pick(data, refAttrs);

                                // 在这些行以外的行不和更新后的键值冲突
                                const count = context.count(entity, {
                                    filter: addFilterSegment([filter, {
                                        $not: operationFilter,
                                    }]),
                                }, { dontCollect: true });
                                const checkCount = checkCountLessThan(count, uniqAttrs);

                                // 更新的行只能有一行
                                const rowCount = context.count(entity, {
                                    filter: operationFilter,
                                }, { dontCollect: true });
                                const checkRowCount = checkCountLessThan(rowCount, uniqAttrs, 1);

                                // 如果更新的行数为零似乎也可以，但这应该不可能出现吧，by Xc 20230131
                                if (checkRowCount instanceof Promise) {
                                    return Promise.all([checkCount, checkRowCount]).then(
                                        () => undefined
                                    );
                                }                                
                            }
                            // 否则需要结合本行现有的属性来进行检查
                            const projection = { id: 1 };
                            for (const attr of uniqAttrs) {
                                Object.assign(projection, {
                                    [attr]: 1,
                                });
                            }

                            const checkWithRows = (rows2: ED[keyof ED]['Schema'][]) => {
                                const rows22 = rows2.map(
                                    ele => Object.assign(ele, data)
                                );
                                // 先检查这些行本身之间是否冲突
                                checkUniqueBetweenRows(rows22, uniqAttrs);
                                const checkResults = rows22.map(
                                    (row) => checkUnique<ED, Cxt | FrontCxt>(entity, row, context, uniqAttrs, {
                                        $not: operationFilter
                                    })
                                );
                                if (checkResults[0] instanceof Promise) {
                                    return Promise.all(checkResults).then(
                                        () => undefined
                                    );
                                }                                
                            };

                            const currentRows = context.select(entity, {
                                data: projection,
                                filter: operationFilter,
                            }, { dontCollect: true });
                            if (currentRows instanceof Promise) {
                                return currentRows.then(
                                    (row2) => checkWithRows(row2 as ED[keyof ED]['Schema'][])
                                );
                            }
                            return checkWithRows(currentRows as ED[keyof ED]['Schema'][]);
                        }
                    });
                }
            }
        }
    }

    return {
        triggers,
        checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}