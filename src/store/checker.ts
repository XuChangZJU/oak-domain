import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import { Checker, CreateTriggerInTxn, EntityDict, Trigger, UpdateTriggerInTxn } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';

export function translateCheckerInAsyncContext<
    ED extends EntityDict & BaseEntityDict,
    Cxt extends AsyncContext<ED> | SyncContext<ED>
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
            return (async ({ operation }, context) => {
                const { filter: operationFilter } = operation;
                assert(operationFilter);
                const filter2 = typeof filter === 'function' ? filter(context) : filter;
                if (await checkFilterContains(entity, context, filter2, operationFilter)) {
                    return 0;
                }
                if (inconsistentRows) {
                    const { entity: entity2, selection: selection2 } = inconsistentRows;
                    const rows2 = await context.select(entity2, selection2(operationFilter), { dontCollect: true });
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
                    }, { dontCollect: true });
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
            }) as UpdateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
        }
        case 'relation': {
            const { relationFilter } = checker;
            return (async ({ operation }, context) => {
                if (context.isRoot()) {
                    return 0;
                }
                // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                operation.filter = combineFilters([operation.filter, relationFilter(context)]);
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
    Cxt extends SyncContext<ED> | AsyncContext<ED>
>(checker: Checker<ED, T, Cxt>): (operation: ED[T]['Operation'], context: Cxt) => void {    
    const { entity, type } = checker;
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            return (operation, context) =>checkerFn(operation.data, context);
        }
        case 'row': {
            const { filter, errMsg } = checker;
            return (operation, context) => {
                const { filter: operationFilter } = operation;
                const filter2 = typeof filter === 'function' ? filter(context) : filter;
                assert(operationFilter);
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter)) {
                    return;
                }
                throw new OakRowInconsistencyException(undefined, errMsg);
            };
        }
        case 'relation': {
            const { relationFilter: filter, errMsg } = checker;
            return (operation, context) => {
                if (context.isRoot()) {
                    return;
                }
                const filter2 = typeof filter === 'function' ? filter(context) : filter;
                const { filter: operationFilter } = operation;
                assert(operationFilter);
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter)) {
                    return;
                }
                throw new OakUserUnpermittedException(errMsg);
            };
        }
        default: {
            assert(false);
        }
    }
}