import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import { Checker, CreateTriggerInTxn, EntityDict, ExpressionRelationChecker, OperateOption, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';

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
                checkerFn(data, context);
                return 0;
            }) as CreateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
        }
        case 'row': {
            const { filter, errMsg, inconsistentRows } = checker;
            return (async ({ operation }, context, option) => {
                const { filter: operationFilter, action } = operation;
                const filter2 = typeof filter === 'function' ? filter(operation, context, option) : filter;
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = addFilterSegment(operationFilter || {}, filter2);
                    return 0;
                }
                else {
                    if (await checkFilterContains(entity, context, filter2, operationFilter || {})) {
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
                operation.filter = combineFilters([operation.filter, relationFilter(operation, context, option)]);
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
                const exprResult = expression(operation, context, option);
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
                        throw new OakUserUnpermittedException(errMsg);
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
                    if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter)) {
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
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter)) {
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
                    const { entity: expressionEntity, expr, filter: expressionFilter } = exprResult;
                    const [result] = context.select(expressionEntity, {
                        data: {
                            $expr: expr,
                        },
                        filter: expressionFilter,
                    }, Object.assign({}, option, { dontCollect: true })) as any[];
                    if (!result.$expr) {
                        // 条件判定为假，抛异常
                        throw new OakRowInconsistencyException(undefined, errMsg);
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
    const checkers: ExpressionRelationChecker<ED, keyof ED, Cxt>[] = [];

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
                        return {
                            entity: userEntityName as T2,
                            expr: {
                                $gt: [{
                                    '#attr': '$$createAt$$',
                                }, 0]
                            },
                            filter: {
                                userId,
                                [entityIdAttr]: {
                                    $in: {
                                        entity: userEntityName,
                                        data: {
                                            [entityIdAttr]: 1,
                                        },
                                        filter,
                                    }
                                },
                                relation: {
                                    $in: legalRelations,
                                }
                            },
                        }
                    },
                    errMsg: '越权操作',
                });
            }
        }
    }

    return checkers;
}