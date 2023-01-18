import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import {
    AuthDefDict, CascadeRelationItem, Checker, CreateTriggerInTxn,
    EntityDict, OperateOption, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn, RelationHierarchy
} from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';
import { uniq } from '../utils/lodash';
import { judgeRelation } from './relation';

export function translateCheckerInAsyncContext<
    ED extends EntityDict & BaseEntityDict,
    Cxt extends AsyncContext<ED>
>(checker: Checker<ED, keyof ED, Cxt>): {
    fn: Trigger<ED, keyof ED, Cxt>['fn'];
    when: 'before' | 'after';
} {
    const { entity, type, action } = checker;
    const when = ((action === 'create' || action instanceof Array && action.includes('create')) && ['relation'].includes(type)) ? 'after' : 'before'
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            const fn = (async ({ operation }, context) => {
                const { data } = operation;
                await checkerFn(data, context);
                return 0;
            }) as CreateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        case 'row': {
            const { filter, errMsg, inconsistentRows } = checker;
            const fn = (async ({ operation }, context, option) => {
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
            return {
                fn,
                when,
            };
        }
        case 'relation': {
            const { relationFilter, errMsg } = checker;
            const fn = (async ({ operation }, context, option) => {
                if (context.isRoot()) {
                    return 0;
                }
                // assert(operation.action !== 'create', `${entity as string}上的create动作定义了relation类型的checker,请使用expressionRelation替代`);
                // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)
                if (operation.action === 'create') {
                    const filter2 = await relationFilter(operation, context, option);

                    const { data } = operation as ED[keyof ED]['Create'];
                    const filter  = data instanceof Array ? {
                        id: {
                            $in: data.map(
                                ele => ele.id,
                            ),
                        },
                    } : {
                        id: data.id,
                    };
                    if (await checkFilterContains<ED, keyof ED, Cxt>(entity, context, filter2, filter, true)) {
                        return 0;
                    }
                    throw new OakUserUnpermittedException(errMsg);
                }
                else {
                    operation.filter = combineFilters([operation.filter, await relationFilter(operation, context, option)]);
                }
                return 0;
            }) as UpdateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        case 'logical':
        case 'logicalRelation': {
            const { checker: checkerFn } = checker;
            const fn = (async ({ operation }, context, option) => {
                if (context.isRoot() && type === 'logicalRelation') {
                    return 0;
                }
                await checkerFn(operation, context, option);
                return 0;
            }) as UpdateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
            return {
                fn,
                when,
            };
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
>(checker: Checker<ED, T, Cxt>): {
    fn: (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
    when: 'before' | 'after';
} {
    const { entity, type, action } = checker;
    const when = ((action === 'create' || action instanceof Array && action.includes('create')) && ['relation'].includes(type)) ? 'after' : 'before'
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt) => checkerFn(operation.data, context);
            return {
                fn,
                when,
            }
        }
        case 'row': {
            const { filter, errMsg } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
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
            return {
                fn,
                when,
            };
        }
        case 'relation': {
            const { relationFilter, errMsg } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
                if (context.isRoot()) {
                    return;
                }
                const filter2 = typeof relationFilter === 'function' ? relationFilter(operation, context, option) : relationFilter;
                const { filter, action } = operation;
                let filter3 = filter;
                if (action === 'create') {
                    const { data } = operation as ED[T]['Create'];
                    filter3 = data instanceof Array ? {
                        id: {
                            $in: data.map(ele => ele.id),
                        },
                    } : { id: data.id };
                }
                assert(filter3);
                assert(!(filter2 instanceof Promise));
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, filter3, true)) {
                    return;
                }
                throw new OakUserUnpermittedException(errMsg);
            };
            return {
                fn,
                when,
            };
        }
        case 'logical':
        case 'logicalRelation': {
            const { checker: checkerFn } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
                if (context.isRoot() && type === 'logicalRelation') {
                    return;
                }
                checkerFn(operation, context, option);
            };
            return {
                fn,
                when,
            };
        }
        default: {
            assert(false);
        }
    }
}

function translateCascadeRelationFilterMaker<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    lch: CascadeRelationItem,
    entity2: keyof ED): (userId: string) => ED[keyof ED]['Selection']['filter'] {
    const { cascadePath, relations } = lch;
    const paths = cascadePath.split('.');

    const translateRelationFilter = <T extends keyof ED>(entity: T): (userId: string) => ED[T]['Selection']['filter'] => {
        // 有两种情况，此entity和user有Relation定义，或是此entity上有userId
        if (schema[entity].relation) {
            const relationEntityName = `user${firstLetterUpperCase(entity as string)}`;
            return (userId) => {
                const filter = relations ? {
                    userId,
                    relation: {
                        $in: relations,
                    },
                } : {
                    userId,
                };
                return {
                    id: {
                        $in: {
                            entity: relationEntityName,
                            data: {
                                [`${entity as string}Id`]: 1,
                            },
                            filter,
                        },
                    },
                }
            };
        }

        const { attributes } = schema[entity];
        assert(attributes.hasOwnProperty('userId') && attributes.userId.type === 'ref' && attributes.userId.ref === 'user', `在${entity as string}上既找不到userId，也没有relation定义`);
        return (userId) => ({
            userId,
        });
    };

    const translateFilterMakerIter = <T extends keyof ED>(entity: T, iter: number): (userId: string) => ED[T]['Selection']['filter'] => {
        const relation = judgeRelation(schema, entity, paths[iter]);
        if (iter === paths.length - 1) {
            if (relation === 2) {
                const filterMaker = translateRelationFilter(paths[iter]);
                return (userId) => {
                    const filter = filterMaker(userId);
                    if (filter!.$in) {
                        return {
                            entity: paths[iter],
                            entityId: filter,
                        };
                    }
                    return {
                        [paths[iter]]: filter,
                    };
                }
            }
            assert(typeof relation === 'string');
            const filterMaker = translateRelationFilter(relation);
            return (userId) => {
                const filter = filterMaker(userId);

                if (filter!.$in) {
                    return {
                        [`${paths[iter]}Id`]: filter
                    };
                }
                return {
                    [paths[iter]]: filter,
                };
            }
        }
        else {
            const subFilterMaker = translateFilterMakerIter(paths[iter], iter + 1);
            if (iter === 0) {
                return (userId) => {
                    const subFilter = subFilterMaker(userId);
                    return {
                        [paths[iter]]: subFilter,
                    };
                };
            }
            return (userId) => ({
                [paths[iter]]: subFilterMaker(userId),
            });
        }
    };

    const filter = cascadePath ? translateFilterMakerIter(entity2, 0) : translateRelationFilter(entity2);
    return filter;
}

function translateActionAuthFilterMaker<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    relationItem: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[],
    entity: keyof ED
): (userId: string) => ED[keyof ED]['Selection']['filter'] {
    if (relationItem instanceof Array) {
        const maker = relationItem.map(
            ele => {
                if (ele instanceof Array) {
                    return ele.map(
                        ele2 => translateCascadeRelationFilterMaker(schema, ele2, entity)
                    );
                }
                return [translateCascadeRelationFilterMaker(schema, ele, entity)];
            }
        );
        return (userId) => ({
            $or: maker.map(
                ele => ({
                    $and: ele.map(
                        ele2 => ele2(userId)!
                    )
                })
            )
        })
    }
    const filterMaker = translateCascadeRelationFilterMaker(schema, relationItem, entity);
    return (userId) => filterMaker(userId);
}


export function createAuthCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
    schema: StorageSchema<ED>,
    authDict: AuthDefDict<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        if (authDict[entity]) {
            const { relationAuth, actionAuth } = authDict[entity]!;
            if (relationAuth) {
                const raFilterMakerDict = {} as Record<string, (userId: string) => ED[keyof ED]['Selection']['filter']>;
                for (const r in relationAuth) {
                    Object.assign(raFilterMakerDict, {
                        [r]: translateActionAuthFilterMaker(schema, relationAuth[r as NonNullable<ED[keyof ED]['Relation']>]!, entity),
                    });
                }
                const userEntityName = `user${firstLetterUpperCase(entity)}`;
                const entityIdAttr = `${entity}Id`;
                checkers.push({
                    entity: userEntityName as keyof ED,
                    action: 'create',
                    type: 'relation',
                    relationFilter: (operation, context) => {
                        const { data } = operation as ED[keyof ED]['Create'];
                        assert(!(data instanceof Array));
                        const { relation, [entityIdAttr]: entityId } = data;
                        const userId = context.getCurrentUserId();
                        if (!raFilterMakerDict[relation]) {
                            return;
                        }
                        const filter = raFilterMakerDict[relation]!(userId!);
                        return {
                            [entity]: filter,
                        };
                    },
                    errMsg: '越权操作',
                });

                checkers.push({
                    entity: userEntityName as keyof ED,
                    action: 'remove' as ED[keyof ED]['Action'],
                    type: 'relation',
                    relationFilter: (operation: any, context: Cxt) => {
                        const userId = context.getCurrentUserId();
                        const { filter } = operation as ED[keyof ED]['Remove'];
                        const makeFilterFromRows = (rows: Partial<ED[keyof ED]['Schema']>[]) => {
                            const relations = uniq(rows.map(ele => ele.relation));
                            const entityIds = uniq(rows.map(ele => ele[entityIdAttr]));
                            assert(entityIds.length === 1, `在回收${userEntityName}上权限时，单次回收涉及到了不同的对象，此操作不被允许`);
                            // const entityId = entityIds[0]!;

                            // 所有的relation条件要同时满足and关系（注意这里的filter翻译出来是在entity对象上，不是在userEntity对象上）
                            return {
                                $and: relations.map(
                                    (relation) => raFilterMakerDict[relation!]
                                ).filter(
                                    ele => !!ele
                                ).map(
                                    ele => ({
                                        [entity]: ele(userId!),
                                    })
                                )
                            } as ED[keyof ED]['Selection']['filter'];
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
                // 转让权限现在用update动作，只允许update userId给其它人
                // todo 等实现的时候再写
            }

            if (actionAuth) {
                for (const a in actionAuth) {
                    const filterMaker = translateActionAuthFilterMaker(schema, actionAuth[a as ED[keyof ED]['Action']]!, entity);
                    checkers.push({
                        entity,
                        action: a as ED[keyof ED]['Action'],
                        type: 'relation',
                        relationFilter: (operation, context) => {
                            // const { filter } = operation;
                            const filter = filterMaker(context.getCurrentUserId()!);
                            return filter;
                        },
                        errMsg: '定义的actionAuth中检查出来越权操作',
                    });
                }
            }
        }
    }

    return checkers;
}