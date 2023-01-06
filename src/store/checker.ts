import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import { Checker, CreateTriggerInTxn, EntityDict, OperateOption, SelectOption, Trigger, UpdateTriggerInTxn } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';

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
                const { entity: expressionEntity, expr, filter: expressionFilter } = expression(operation, context, option);
                const [result] = await context.select(expressionEntity, {
                    data: {
                        $expr: expr,
                    },
                    filter: expressionFilter,
                }, Object.assign({}, option, { dontCollect: true }));
                if (!result) {
                    // 条件判定为假，抛异常
                    throw new OakRowInconsistencyException(undefined, errMsg);
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
                const { entity: expressionEntity, expr, filter: expressionFilter } = expression(operation, context, option);
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
            };
        }
        default: {
            assert(false);
        }
    }
}