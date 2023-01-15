import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakDataException, OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import { Checker, CreateTriggerInTxn, EntityDict, ExpressionRelationChecker, OperateOption, RefOrExpression, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';
import { intersection, uniq } from '../utils/lodash';

export function translateCheckerInAsyncContext<
    ED extends EntityDict & BaseEntityDict,
    Cxt extends AsyncContext<ED>
>(checker: Checker<ED, keyof ED, Cxt>): Trigger<ED, keyof ED, Cxt>['fn'] {
    const { entity, type } = checker;
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            return (async ({ operation }, context) => {
                const { data } = operation;
                await checkerFn(data, context);
                return 0;
            }) as CreateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
        }
        case 'row': {
            const { filter, errMsg, inconsistentRows } = checker;
            return (async ({ operation }, context, option) => {
                const { filter: operationFilter, action } = operation;
                const filter2 = typeof filter === 'function' ? await filter(operation, context, option) : filter;
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = addFilterSegment(operationFilter || {}, filter2);
                    return 0;
                }
                else {
                    if (await checkFilterContains(entity, context, filter2, operationFilter || {}, true)) {
                        return 0;
                    }
                    if (inconsistentRows) {
                        const { entity: entity2, selection: selection2 } = inconsistentRows;
                        const rows2 = await context.select(entity2, selection2(operationFilter), {
                            dontCollect: true,
                            blockTrigger: true,
                        });
                        const data = {};
                        rows2.forEach(
                            ele => Object.assign(data, {
                                [ele.id as string]: ele,
                            })
                        );

                        throw new OakRowInconsistencyException({
                            a: 's',
                            d: {
                                [entity2]: data,
                            }
                        }, errMsg);
                    }
                    else {
                        const rows2 = await context.select(entity, {
                            data: getFullProjection(entity, context.getSchema()),
                            filter: Object.assign({}, operationFilter, {
                                $not: filter2,
                            })
                        }, {
                            dontCollect: true,
                            blockTrigger: true,
                        });
                        const data = {};
                        rows2.forEach(
                            ele => Object.assign(data, {
                                [ele.id as string]: ele,
                            })
                        );

                        throw new OakRowInconsistencyException({
                            a: 's',
                            d: {
                                [entity]: data,
                            }
                        }, errMsg);
                    }
                }
            }) as UpdateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
        }
        case 'relation': {
            const { relationFilter } = checker;
            return (async ({ operation }, context, option) => {
                if (context.isRoot()) {
                    return 0;
                }
                // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                operation.filter = combineFilters([operation.filter, await relationFilter(operation, context, option)]);
                return 0;
            }) as UpdateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
        }    
        case 'expression': 
        case 'expressionRelation': {
            const { expression, errMsg } = checker;
            return (async ({ operation }, context, option) => {
                if (context.isRoot() && type === 'expressionRelation') {
                    return 0;
                }
                const exprResult = await expression(operation, context, option);
                if (typeof exprResult === 'string') {
                    throw new OakUserUnpermittedException(exprResult || errMsg);
                }
                else if (exprResult === undefined) {
                    return 0;
                }
                else {
                    const { entity: expressionEntity, expr, filter: expressionFilter } = exprResult;
                    const [result] = await context.select(expressionEntity, {
                        data: {
                            $expr: expr,
                        },
                        filter: expressionFilter,
                    }, Object.assign({}, option, { dontCollect: true }));
                    if (!result) {
                        // 条件判定为假，抛异常
                        if (type === 'expression') {
                            throw new OakRowInconsistencyException(undefined, errMsg);
                        }
                        else {
                            throw new OakUserUnpermittedException(errMsg);
                        }
                    }
                }
                return 0;
            }) as UpdateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
        }
        default: {
            assert(false);
        }
    }
}

export function translateCheckerInSyncContext<
    ED extends EntityDict & BaseEntityDict,
    T extends keyof ED,
    Cxt extends SyncContext<ED>
>(checker: Checker<ED, T, Cxt>): (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void {
    const { entity, type } = checker;
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            return (operation, context) => checkerFn(operation.data, context);
        }
        case 'row': {
            const { filter, errMsg } = checker;
            return (operation, context, option) => {
                const { filter: operationFilter, action } = operation;
                const filter2 = typeof filter === 'function' ? filter(operation, context, option) : filter;
                assert(operationFilter);
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = addFilterSegment(operationFilter, filter2);
                    return 0;
                }
                else {
                    assert(!(filter2 instanceof Promise));
                    if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter, true)) {
                        return;
                    }
                    throw new OakRowInconsistencyException(undefined, errMsg);
                }
            };
        }
        case 'relation': {
            const { relationFilter: filter, errMsg } = checker;
            return (operation, context, option) => {
                if (context.isRoot()) {
                    return;
                }
                const filter2 = typeof filter === 'function' ? filter(operation, context, option) : filter;
                const { filter: operationFilter } = operation;
                assert(operationFilter);
                assert(!(filter2 instanceof Promise));
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter, true)) {
                    return;
                }
                throw new OakUserUnpermittedException(errMsg);
            };
        }   
        case 'expression': 
        case 'expressionRelation': {
            const { expression, errMsg } = checker;
            return (operation, context, option) => {
                if (context.isRoot() && type === 'expressionRelation') {
                    return;
                }
                const exprResult = expression(operation, context, option);
                if (typeof exprResult === 'string') {
                    throw new OakUserUnpermittedException(exprResult || errMsg);
                }
                else if (exprResult === undefined) {
                    return 0;
                }
                else {
                    assert(!(exprResult instanceof Promise));
                    const { entity: expressionEntity, expr, filter: expressionFilter } = exprResult;
                    const [result] = context.select(expressionEntity, {
                        data: {
                            $expr: expr,
                        },
                        filter: expressionFilter,
                    }, Object.assign({}, option, { dontCollect: true })) as any[];
                    if (!result.$expr) {
                        // 条件判定为假，抛异常
                        if (type === 'expression') {
                            throw new OakRowInconsistencyException(undefined, errMsg);
                        }
                        else {
                            throw new OakUserUnpermittedException(errMsg);
                        }
                    }
                    return;
                }
            };
        }
        default: {
            assert(false);
        }
    }
}


export function createRelationHierarchyCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        const { relationHierarchy } = schema[entity];
        if (relationHierarchy) {
            // 先build反向hierarchy的map
            const reverseHierarchy = {} as Record<string, string[]>;
            for (const r in relationHierarchy) {
                for (const r2 of relationHierarchy[r]!) {
                    if (!reverseHierarchy[r2]) {
                        reverseHierarchy[r2] = [r];
                    }
                    else {
                        reverseHierarchy[r2].push(r);
                    }
                }
            }

            // 对userEntity对象的授权和回收建立checker
            const userEntityName = `user${firstLetterUpperCase(entity)}`;
            const entityIdAttr = `${entity}Id`;
            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'create',
                type: 'expressionRelation',
                expression: <T2 extends keyof ED>(operation: any, context: Cxt) => {
                    const { data } = operation as ED[keyof ED]['Operation'];
                    const { relation, [entityIdAttr]: entityId } = data as Record<string, string>;
                    const legalRelations = reverseHierarchy[relation];
                    if (!legalRelations) {
                        return undefined;
                    }
                    if (legalRelations.length === 0) {
                        return '这是不应该跑出来的情况，请杀程序员祭天';
                    }
                    const userId = context.getCurrentUserId();
                    return {
                        entity: userEntityName as T2,
                        expr: {
                            $gt: [{
                                '#attr': '$$createAt$$',
                            }, 0]
                        },
                        filter: {
                            userId,
                            [entityIdAttr]: entityId,
                            relation: {
                                $in: legalRelations,
                            }
                        }
                    }
                },
                errMsg: '越权操作',
            });
            for (const r in reverseHierarchy) {
                checkers.push({
                    entity: userEntityName as keyof ED,
                    action: 'remove',
                    type: 'expressionRelation',
                    expression: <T2 extends keyof ED>(operation: any, context: Cxt) => {
                        const userId = context.getCurrentUserId();
                        const { filter } = operation as ED[keyof ED]['Remove'];
                        const legalRelations = reverseHierarchy[r];
                        if (legalRelations.length === 0) {
                            return '这是不应该跑出来的情况，请杀程序员祭天';
                        }
                        const makeFilterFromRows = (rows: Partial<ED[T2]['Schema']>[]) => {
                            const relations = uniq(rows.map(ele => ele.relation));
                            const entityIds = uniq(rows.map(ele => ele[entityIdAttr]));
                            assert(entityIds.length === 1, `在回收${userEntityName}上权限时，单次回收涉及到了不同的对象，此操作不被允许`);
                            const legalRelationss = relations.map(
                                ele => {
                                    if (reverseHierarchy[ele!]) {
                                        return reverseHierarchy[ele!];
                                    }
                                    assert(false, `在回收${userEntityName}上类型为${ele}的权限时，找不到对应的定义，不应该出现的情况`);
                                }
                            );
                            // 如果要删除多个不同的权限，这里必须要有它们共同的上级权限
                            const legaRelations = intersection(legalRelationss);
                            return {
                                entity: userEntityName as T2,
                                expr: {
                                    $gt: [{
                                        '#attr': '$$createAt$$',
                                    }, 0]
                                } as RefOrExpression<keyof ED[T2]['OpSchema']>,
                                filter: {
                                    userId,
                                    [entityIdAttr]: entityIds[0],
                                    relation: {
                                        $in: legaRelations,
                                    }
                                },
                            }
                        };

                        const toBeRemoved = context.select(userEntityName, {
                            data: {
                                id: 1,
                                relation: 1,
                                [entityIdAttr]: 1,
                            },
                            filter,
                        }, { dontCollect: true });
                        if (toBeRemoved instanceof Promise) {
                            return toBeRemoved.then(
                                (rows) => makeFilterFromRows(rows)
                            );
                        }
                        return makeFilterFromRows(toBeRemoved);
                    },
                    errMsg: '越权操作',
                });
            }

            /* // 一个人不能授权给自己，也不能删除自己的授权
            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'create' as ED[keyof ED]['Action'],
                type: 'data',
                checker: (data, context) => {
                    assert(!(data instanceof Array));
                    const { userId } = data as ED[keyof ED]['CreateSingle']['data'];
                    const userId2 = context.getCurrentUserId(true);
                    if (userId === userId2) {
                        throw new OakDataException('不允许授权给自己');
                    }
                }
            });

            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'remove' as ED[keyof ED]['Action'],
                type: 'row',
                filter: (operation, context) => {
                    const userId = context.getCurrentUserId(true);
                    if (userId) {
                        return {
                            userId: {
                                $ne: userId,
                            },
                        };
                    }
                    console.warn(`没有当前用户但在删除权限，请检查。对象是${entity}`);
                    return {};
                },
                errMsg: '不允许回收自己的授权',
            }); */

            // 转让权限现在用update动作，只允许update userId给其它人
            // todo 等实现的时候再写
        }
    }

    return checkers;
}