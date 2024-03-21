import { ActionDictOfEntityDict, Checker, EntityDict, StorageSchema, RowChecker, OakUniqueViolationException, CHECKER_MAX_PRIORITY, AttrUpdateMatrix, LogicalChecker, OakAttrCantUpdateException } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { pick, intersection, difference } from '../utils/lodash';
import { checkFilterContains, combineFilters } from "./filter";
import { EntityDict as BaseEntityDict } from '../base-app-domain/EntityDict';
import { createModiRelatedCheckers } from "./modi";
import { createCreateCheckers, createRemoveCheckers } from "./checker";
import { readOnlyActions } from "../actions/action";


function checkUniqueBetweenRows(rows: Record<string, any>[], uniqAttrs: string[]) {
    // 先检查这些行本身之间有无unique冲突
    const dict: Record<string, 1> = {};
    for (const row of rows) {
        let s = '';
        for (const a of uniqAttrs) {
            if (row[a] === null || row[a] === undefined) {
                s + row.id;
            }
            else {
                s + `-${row[a]}`;
            }
        }
        if (dict[s]) {
            throw new OakUniqueViolationException([{
                id: row.id,
                attrs: uniqAttrs,
            }]);
        }
        else {
            dict[s] = 1;
        }
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

function checkUnique<ED extends EntityDict & BaseEntityDict, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
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
    const filter2 = extraFilter ? combineFilters(entity, context.getSchema(), [filter, extraFilter]) : filter;
    const count = context.count(entity, { filter: filter2 }, { dontCollect: true });
    return checkCountLessThan(count, uniqAttrs, 0, row.id)
}

function createUniqueCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(schema: StorageSchema<ED>) {
    const checkers: Array<Checker<ED, keyof ED, Cxt | FrontCxt>> = [];
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
                        type: 'logicalData',
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
                            else if (data) {
                                return checkUnique<ED, Cxt | FrontCxt>(entity, data, context, uniqAttrs);
                            }
                        }
                    }, {
                        entity,
                        action: 'update',       // 只检查update，其它状态转换的action应该不会涉及unique约束的属性
                        type: 'logicalData',
                        priority: CHECKER_MAX_PRIORITY,       // 优先级要放在最低，所有前置的checker/trigger将数据完整之后再在这里检测
                        checker: (operation, context) => {
                            const { data, filter: operationFilter } = operation as ED[keyof ED]['Update'];
                            if (data) {
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
                                        filter: combineFilters(entity, context.getSchema(), [filter, {
                                            $not: operationFilter,
                                        }]),
                                    }, { dontCollect: true });
                                    const checkCount = checkCountLessThan(count, uniqAttrs, 0, operationFilter?.id);

                                    // 更新的行只能有一行
                                    const rowCount = context.count(entity, {
                                        filter: operationFilter,
                                    }, { dontCollect: true });
                                    const checkRowCount = checkCountLessThan(rowCount, uniqAttrs, 1, operationFilter?.id);

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
                        }
                    });
                }
            }
        }
    }
    return checkers;
}

function createActionTransformerCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(
    actionDefDict: ActionDictOfEntityDict<ED>
) {
    const checkers: Array<Checker<ED, keyof ED, Cxt | FrontCxt>> = [];
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
                    type: 'logicalData',
                    entity,
                    checker: (operation) => {
                        const { data } = operation;
                        if (data instanceof Array) {
                            data.forEach(
                                (d) => Object.assign(d, {
                                    [attr]: stm[action][1],
                                })
                            );
                        }
                        else {
                            Object.assign(data, {
                                [attr]: stm[action][1],
                            });
                        }
                    }
                });
            }

            if (is) {
                checkers.push({
                    action: 'create' as ED[keyof ED]['Action'],
                    type: 'logicalData',
                    entity,
                    priority: 10,       // 优先级要高，先于真正的data检查进行
                    checker: (operation) => {
                        const { data } = operation;
                        if (data instanceof Array) {
                            (data as Readonly<ED[keyof ED]['CreateMulti']['data']>).forEach(
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
                            if (!(data as Readonly<ED[keyof ED]['CreateSingle']['data']>)[attr]) {
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

    return checkers;
}

function createAttrUpdateCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(
    schema: StorageSchema<ED>,
    attrUpdateMatrix: AttrUpdateMatrix<ED>
) {
    const checkers: Checker<ED, keyof ED, Cxt | FrontCxt>[] = [];
    for (const entity in attrUpdateMatrix) {
        const matrix = attrUpdateMatrix[entity]!;
        const updateAttrs = Object.keys(matrix) as string[];
        const { actions } = schema[entity];
        const updateActions = actions.filter(
            (a) => !readOnlyActions.concat(['create', 'remove']).includes(a)
        );

        /**
         * 如果一个entity定义了attrUpdateMatrix，则必须严格遵循定义，未出现在matrix中的属性不允许更新
         */
        const updateChecker: LogicalChecker<ED, keyof ED, Cxt | FrontCxt> = {
            entity,
            action: updateActions,
            type: 'logicalData',
            checker({ data, filter, action }, context) {
                const attrs = Object.keys(data);
                const extras = difference(attrs, updateAttrs);
                if (extras.length > 0) {
                    throw new OakAttrCantUpdateException(entity, extras, '更新了不允许的属性');
                }
                const condition = attrs.map(ele => matrix[ele]!);
                const actions = condition.map(ele => ele.actions).filter(ele => !!ele);
                const filters = condition.map(ele => ele.filter).filter(ele => !!ele);
                const a = actions.length > 0 && intersection(actions.flat());
                const f = filters.length > 0 && combineFilters(entity, schema, filters);
                if (a) {
                    if (!a.includes(action)) {
                        // 找到不满足的那个attr
                        const attrsIllegal = attrs.filter(
                            (attr) => matrix[attr]?.actions && !matrix[attr]?.actions?.includes(action!)
                        );
                        throw new OakAttrCantUpdateException(entity, attrsIllegal, `${attrsIllegal}不允许被${action}动作更新`);
                    }
                }
                if (f) {
                    const result = checkFilterContains<ED, keyof ED, Cxt>(entity, context as any, f, filter, true);
                    if (result instanceof Promise) {
                        return result.then(
                            (v) => {
                                if (!v) {
                                    throw new OakAttrCantUpdateException(entity, attrs, '更新的行当前属性不满足约束，请仔细检查数据');
                                }
                            }
                        );
                    }
                    if (!result) {
                        throw new OakAttrCantUpdateException(entity, attrs, '更新的行当前属性不满足约束，请仔细检查数据');
                    }
                }
            }
        };
        checkers.push(updateChecker);
    }

    return checkers;
}

export function makeIntrinsicCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(
    schema: StorageSchema<ED>,
    actionDefDict: ActionDictOfEntityDict<ED>,
    attrUpdateMatrix?: AttrUpdateMatrix<ED>,
) {
    const checkers: Checker<ED, keyof ED, Cxt | FrontCxt>[] = [];
    checkers.push(...createModiRelatedCheckers<ED, Cxt>(schema));
    checkers.push(...createRemoveCheckers<ED, Cxt | FrontCxt>(schema));
    checkers.push(...createCreateCheckers<ED, Cxt | FrontCxt>(schema));
    // action状态转换矩阵相应的checker
    checkers.push(...createActionTransformerCheckers(actionDefDict));
    // unique索引相应的checker
    checkers.push(...createUniqueCheckers<ED, Cxt, FrontCxt>(schema));
    if (attrUpdateMatrix) {
        // attrUpdateMatrix相应的checker
        checkers.push(...createAttrUpdateCheckers<ED, Cxt, FrontCxt>(schema, attrUpdateMatrix));
    }

    return checkers;
}