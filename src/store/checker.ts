import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import {
    AuthDefDict, CascadeRelationItem, Checker, CreateTriggerInTxn,
    EntityDict, OperateOption, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn, RelationHierarchy, SelectOpResult, REMOVE_CASCADE_PRIORITY, RefOrExpression, SyncOrAsync
} from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';
import { union, uniq, difference } from '../utils/lodash';
import { judgeRelation } from './relation';
import { generateNewId } from '../utils/uuid';

export function translateCheckerInAsyncContext<
    ED extends EntityDict & BaseEntityDict,
    T extends keyof ED,
    Cxt extends AsyncContext<ED>
>(checker: Checker<ED, T, Cxt>): {
    fn: Trigger<ED, T, Cxt>['fn'];
    when: 'before' | 'after';
} {
    const { entity, type } = checker;
    const when = 'before';      // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
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
                const filter2 = typeof filter === 'function' ? await (filter as Function)(operation, context, option) : filter;
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = addFilterSegment(operationFilter || {}, filter2);
                    return 0;
                }
                else {
                    if (await checkFilterContains<ED, keyof ED, Cxt>(entity, context, filter2, operationFilter || {}, true)) {
                        return 0;
                    }
                    if (inconsistentRows) {
                        const { entity: entity2, selection: selection2 } = inconsistentRows;
                        const rows2 = await context.select(entity2, selection2(operationFilter), {
                            dontCollect: true,
                            blockTrigger: true,
                        });

                        const e = new OakRowInconsistencyException<ED>(undefined, errMsg);
                        e.addData(entity2, rows2);
                        throw e;
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

                        const e = new OakRowInconsistencyException<ED>(undefined, errMsg);
                        e.addData(entity, rows2);
                        throw e;
                    }
                }
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
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

                const result = typeof relationFilter === 'function' ? await relationFilter(operation, context, option) : relationFilter;

                if (result) {
                    if (operation.action === 'create') {
                        console.warn(`${entity as string}对象的create类型的checker中，存在无法转换为表达式形式的情况，请尽量使用authDef格式定义这类checker`);
                    }
                    else {
                        operation.filter = combineFilters([operation.filter, result as ED[T]['Selection']['filter']]);
                    }
                }
                return 0;
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
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
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
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
    const { entity, type } = checker;
    const when = 'before';      // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
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
                const filter2 = typeof filter === 'function' ? (filter as Function)(operation, context, option) : filter;
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
                    const e = new OakRowInconsistencyException(undefined, errMsg);
                    throw e;
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
                const result = typeof relationFilter === 'function' ? relationFilter(operation, context, option) : relationFilter;

                assert(!(result instanceof Promise));
                if (result) {
                    const { filter, action } = operation;
                    if (action === 'create') {
                        console.warn(`${entity as string}对象的create类型的checker中，存在无法转换为表达式形式的情况，请尽量使用authDef格式定义这类checker`);
                        return;
                    }
                    assert(filter);
                    if (checkFilterContains<ED, T, Cxt>(entity, context, result as ED[T]['Selection']['filter'], filter, true)) {
                        return;
                    }
                    throw new OakUserUnpermittedException(errMsg);
                }
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

type FilterMakeFn<ED extends EntityDict & BaseEntityDict> = (operation: ED[keyof ED]['Operation'] | ED[keyof ED]['Selection'], userId: string) => ED[keyof ED]['Selection']['filter'] | {
    $entity: keyof ED;
    $filter?: ED[keyof ED]['Selection']['filter'];
    $count?: number;
};

function translateCascadeRelationFilterMaker<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    lch: CascadeRelationItem,
    entity2: keyof ED,
    pathPrefix?: string): FilterMakeFn<ED> {
    const { cascadePath, relations } = lch;
    const paths = cascadePath ? cascadePath.split('.') : [];
    if (pathPrefix) {
        paths.unshift(pathPrefix);
    }

    const translateRelationFilter = <T extends keyof ED>(entity: T): (userId: string) => ED[T]['Selection']['filter'] => {
        // 有两种情况，此entity和user有Relation定义，或是此entity已经指向user
        if (entity === 'user') {
            return (userId) => ({
                id: userId,
            });
        }
        else if (schema[entity].relation) {
            if (relations) {
                const diff = difference(relations, schema[entity].relation!);
                if (diff.length > 0) {
                    throw new Error(`${entity2 as string}上某auth定义的relations中含有不可识别的关系定义${diff.join(',')}， 请仔细检查`);
                }
            }
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
        else {
            assert(false, `${entity2 as string}上某auth定义的cascadePath${cascadePath}不能定位到User对象或者和User关联的关系对象， 请仔细检查`);
        }
    };

    const translateFilterMakerIter = <T extends keyof ED>(entity: T, iter: number): (userId: string) => ED[T]['Selection']['filter'] => {
        const relation = judgeRelation(schema, entity, paths[iter]);
        assert(relation === 2 || typeof relation === 'string');

        if (iter === paths.length - 1) {
            if (relation === 2) {
                const filterMaker2 = translateRelationFilter(paths[iter]);
                return (userId) => {
                    const filter = filterMaker2(userId)!;
                    assert(filter.id);
                    return {
                        entity: paths[iter],
                        entityId: filter.id,
                    };
                }
            }
            const filterMaker2 = translateRelationFilter(relation);
            return (userId) => {
                const filter = filterMaker2(userId)!;

                assert(filter.id);
                return {
                    [`${paths[iter]}Id`]: filter.id,
                };
            }
        }
        else {
            const filterMaker = relation === 2 ? translateFilterMakerIter(paths[iter], iter + 1) : translateFilterMakerIter(relation, iter + 1);
            return (userId) => ({
                [paths[iter]]: filterMaker(userId),
            });
        }
    };

    const filterMaker = paths.length ? translateFilterMakerIter(entity2, 0) : translateRelationFilter(entity2);
    if (!paths.length) {
        return (oper, userId) => filterMaker(userId);
    }
    /**
     * 针对第一层做一下特别优化，比如对象A指向对象B（多对一），如果A的cascadePath是 'B'，
     * 当create A时，会带有Bid。此时生成该B对象上的相关表达式查询返回，可以避免必须将此判定在对象创建之后再做
     * 另一使用场景是，在查询A时，如果带有Bid（在对象跳一对多子对象场景下很常见），可以提前判定这个查询对某些用户一定返回空集
     */
    const [attr] = paths;
    const relation = judgeRelation(schema, entity2, attr);
    assert(relation === 2 || typeof relation === 'string');
    const filterMaker2 = paths.length > 1
        ? (relation === 2 ? translateFilterMakerIter(attr, 1) : translateFilterMakerIter(relation, 1))
        : (relation === 2 ? translateRelationFilter(attr) : translateRelationFilter(relation));
    return (operation, userId) => {
        const { action } = operation as ED[keyof ED]['Operation'];
        if (action === 'create') {
            const { data } = operation as ED[keyof ED]['Create'];
            const getForeignKeyId = (d: ED[keyof ED]['CreateSingle']['data']) => {
                if (relation === 2) {
                    if (d.entity === attr && typeof d.entityId === 'string') {
                        return d.entitId as string;
                    }
                    throw new OakUserUnpermittedException();
                }
                else {
                    assert(typeof relation === 'string');
                    if (typeof d[`${attr}Id`] === 'string') {
                        return d[`${attr}Id`] as string;
                    }
                    throw new OakUserUnpermittedException();
                }
            };
            if (relation === 2) {
                if (data instanceof Array) {
                    const fkIds = uniq(data.map(d => getForeignKeyId(d)));
                    return {
                        $entity: attr,
                        $filter: addFilterSegment(filterMaker2(userId), { id: { $in: fkIds } }),
                        $count: fkIds.length,
                    };
                }
                const fkId = getForeignKeyId(data);
                return {
                    $entity: attr,
                    $filter: addFilterSegment(filterMaker2(userId), { id: fkId }),
                };
            }
            assert(typeof relation === 'string');
            if (data instanceof Array) {
                const fkIds = uniq(data.map(d => getForeignKeyId(d)));
                return {
                    $entity: relation,
                    $filter: addFilterSegment(filterMaker2(userId), { id: { $in: fkIds } }),
                    $count: fkIds.length,
                };
            }
            const fkId = getForeignKeyId(data);
            return {
                $entity: relation,
                $filter: addFilterSegment(filterMaker2(userId), { id: fkId }),
            };
        }
        const { filter } = operation;
        if (relation === 2 && filter?.entity === attr && filter?.entityId) {
            if (typeof filter.entityId === 'string') {
                return {
                    $entity: attr,
                    $filter: addFilterSegment(filterMaker2(userId), { id: filter.entityId }),
                };
            }
            else if (filter.entityId.$in && filter.entityId.$in instanceof Array) {
                const entityIds = uniq(filter.entityId.$in);
                return {
                    $entity: relation,
                    $filter: addFilterSegment(filterMaker2(userId), { id: { $in: entityIds } }),
                    $count: entityIds.length,
                };
            }
        }
        else if (filter && filter[`${attr}Id`]) {
            if (typeof filter[`${attr}Id`] === 'string') {
                return {
                    $entity: attr,
                    $filter: addFilterSegment(filterMaker2(userId), { id: filter[`${attr}Id`] }),
                };
            }
            else if (filter[`${attr}Id`].$in && filter[`${attr}Id`].$in instanceof Array) {
                const entityIds = uniq(filter[`${attr}Id`].$in);
                return {
                    $entity: relation,
                    $filter: addFilterSegment(filterMaker2(userId), { id: { $in: entityIds } }),
                    $count: entityIds.length,
                };
            }
        }
        return filterMaker(userId);
    };
}

function translateActionAuthFilterMaker<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    relationItem: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[],
    entity: keyof ED,
    pathPrefix?: string,
): FilterMakeFn<ED> | (FilterMakeFn<ED> | FilterMakeFn<ED>[])[] {
    if (relationItem instanceof Array) {
        const maker = relationItem.map(
            ele => {
                if (ele instanceof Array) {
                    return ele.map(
                        ele2 => translateCascadeRelationFilterMaker(schema, ele2, entity, pathPrefix)
                    );
                }
                return translateCascadeRelationFilterMaker(schema, ele, entity, pathPrefix);
            }
        );
        return maker;
    }
    const filterMaker = translateCascadeRelationFilterMaker(schema, relationItem, entity, pathPrefix);
    return filterMaker;
}

function makePotentialFilter<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>> (
    operation: ED[keyof ED]['Operation'] | ED[keyof ED]['Selection'],
    context: Cxt,
    filterMaker: FilterMakeFn<ED> | (FilterMakeFn<ED> | FilterMakeFn<ED>[])[]): SyncOrAsync<ED[keyof ED]['Selection']['filter']> {
    const userId = context.getCurrentUserId();
    assert(userId!);
    const filters = filterMaker instanceof Array ? filterMaker.map(
        ele => {
            if (ele instanceof Array) {
                return ele.map(
                    ele2 => ele2(operation, userId),
                );
            }
            return ele(operation, userId);
        }
    ) : [filterMaker(operation, userId)];

    /**
     * 在下面的逻辑中，如果某个maker返回的是$entity类型，则检查是否有满足条件的项，没有就要抛出异常，有就返回undefined
     * undefined项即意味着该条件通过
     * 再加上and和or的布尔逻辑判断，得到最终结果
     * 还要考虑同步和异步……
     * 代码比较复杂，因为原先没有$entity这种返回结果的设计
     * by Xc 20130219
     */
    const filtersOr: (SyncOrAsync<ED[keyof ED]['Selection']['filter'] | OakUserUnpermittedException<ED>>)[] = [];
    let isAsyncOr = false;
    for (const f of filters) {
        if (f instanceof Array) {
            let isAsyncAnd = true;
            const filtersAnd: (SyncOrAsync<ED[keyof ED]['Selection']['filter'] | OakUserUnpermittedException<ED>>)[] = [];
            for (const ff of f) {
                if (ff?.$entity) {
                    const { $entity, $filter, $count = 1 } = ff!;
                    const count = context.count($entity, {
                        filter: $filter,
                    }, {});
                    if (count instanceof Promise) {
                        isAsyncAnd = true;
                        filtersAnd.push(
                            count.then(
                                (c2) => {
                                    if (c2 >= $count) {
                                        return undefined;
                                    }
                                    return new OakUserUnpermittedException();
                                }
                            )
                        );
                    }
                    else {
                        filtersAnd.push(count >= $count ? undefined : new OakUserUnpermittedException());
                    }
                }
                else if (ff) {
                    filtersAnd.push(ff as ED[keyof ED]['Selection']['filter']);
                }
            }
            if (isAsyncAnd = true) {
                isAsyncOr = true;
                filtersOr.push(isAsyncAnd ? Promise.all(filtersAnd).then(
                    (fa) => {
                        const faR: ED[keyof ED]['Selection']['filter'][] = [];
                        for (const faItem of fa) {
                            if (faItem instanceof OakUserUnpermittedException) {
                                return faItem;
                            }
                            else if (faItem) {
                                faR.push(faItem);
                            }
                        }
                        if (faR.length > 0) {
                            return {
                                $and: faR,
                            };
                        }
                    }
                ) : ({
                    $and: filtersAnd,
                } as ED[keyof ED]['Selection']['filter']));
            }
        }
        else {
            if (f?.$entity) {
                const { $entity, $filter, $count = 1 } = f!;
                const count = context.count($entity, {
                    filter: $filter,
                }, {});
                if (count instanceof Promise) {
                    isAsyncOr = true;
                    filtersOr.push(
                        count.then(
                            (c2) => c2 >= $count ? undefined : new OakUserUnpermittedException()
                        )
                    );
                }
                else {
                    filtersOr.push(count >= $count ? undefined : new OakUserUnpermittedException());
                }
            }
            else if (f) {
                filtersOr.push(f as ED[keyof ED]['Selection']['filter']);
            }
        }
    }

    // or的逻辑是，有一个成功就直接通过
    const returnOrFilters = (filters: (ED[keyof ED]['Selection']['filter'] | OakUserUnpermittedException<ED>)[]) => {
        if (filters.length === 0 || filters.includes(undefined)) {
            return undefined;
        }
        const foFilters = filters.filter(
            ele => ele !== undefined && !(ele instanceof OakUserUnpermittedException)
        );
        if (foFilters.length > 0) {
            return {
                $or: foFilters,
            };
        }
        throw new OakUserUnpermittedException();
    };
    if (isAsyncOr) {
        return Promise.all(filtersOr)
            .then(
                (filters) => returnOrFilters(filters)
            );
    }
    return returnOrFilters(filtersOr);
}

/**
 * 根据权限定义，创建出相应的checker
 * @param schema 
 * @param authDict 
 * @returns 
 */
export function createAuthCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
    schema: StorageSchema<ED>,
    authDict: AuthDefDict<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        if (authDict[entity]) {
            const { relationAuth, actionAuth } = authDict[entity]!;
            if (relationAuth) {
                const raFilterMakerDict = {} as Record<string, FilterMakeFn<ED> | (FilterMakeFn<ED> | FilterMakeFn<ED>[])[]>;
                const userEntityName = `user${firstLetterUpperCase(entity)}`;
                for (const r in relationAuth) {
                    Object.assign(raFilterMakerDict, {
                        [r]: translateActionAuthFilterMaker(schema, relationAuth[r as NonNullable<ED[keyof ED]['Relation']>]!, userEntityName, entity),
                    });
                }
                const entityIdAttr = `${entity}Id`;
                checkers.push({
                    entity: userEntityName as keyof ED,
                    action: 'create',
                    type: 'relation',
                    relationFilter: (operation, context) => {
                        const { data } = operation as ED[keyof ED]['Create'];
                        assert(!(data instanceof Array));
                        const { relation, [entityIdAttr]: entityId } = data;
                        if (!raFilterMakerDict[relation]) {
                            return;
                        }
                        const filter = makePotentialFilter(operation, context, raFilterMakerDict[relation]);
                        
                        return filter;
                    },
                    errMsg: '越权操作',
                });

                checkers.push({
                    entity: userEntityName as keyof ED,
                    action: 'remove' as ED[keyof ED]['Action'],
                    type: 'relation',
                    relationFilter: (operation: any, context: Cxt) => {
                        // 目前过不去
                        return undefined;
                        /* const userId = context.getCurrentUserId();
                        const { filter } = operation as ED[keyof ED]['Remove'];
                        const makeFilterFromRows = (rows: Partial<ED[keyof ED]['Schema']>[]): SyncOrAsync<ED[keyof ED]['Selection']['filter']> => {
                            const relations = uniq(rows.map(ele => ele.relation));
                            const entityIds = uniq(rows.map(ele => ele[entityIdAttr]));
                            assert(entityIds.length === 1, `在回收${userEntityName}上权限时，单次回收涉及到了不同的对象，此操作不被允许`);
                            // const entityId = entityIds[0]!;

                            // 所有的relation条件要同时满足and关系（注意这里的filter翻译出来是在entity对象上，不是在userEntity对象上）
                            const filtersAnd = relations.map(
                                (relation) => raFilterMakerDict[relation!]
                            ).filter(
                                ele => !!ele
                            ).map(
                                ele => makePotentialFilter(operation, context, ele)
                            );
                            if (filtersAnd.find(ele => ele instanceof Promise)) {
                                return Promise.all(filtersAnd).then(
                                    (fa) => {
                                        if (fa.length > 0) {
                                            return {
                                                $and: fa,
                                            } as ED[keyof ED]['Selection']['filter'];
                                        }
                                    }
                                );
                            }
                            if (filtersAnd.length > 0) {
                                return {
                                    $and: filtersAnd
                                } as ED[keyof ED]['Selection']['filter'];
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
                        return makeFilterFromRows(toBeRemoved); */
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
                            const filter = makePotentialFilter(operation, context, filterMaker);
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

/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema 
 * @returns 
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
export function createRemoveCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>, authDict?: AuthDefDict<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    // 先建立所有的一对多的关系
    const OneToManyMatrix: Partial<Record<keyof ED, Array<[keyof ED, string]>>> = {};
    const OneToManyOnEntityMatrix: Partial<Record<keyof ED, Array<keyof ED>>> = {};

    const addToMto = (e: keyof ED, f: keyof ED, attr: string) => {
        if (OneToManyMatrix[f]) {
            OneToManyMatrix[f]?.push([e, attr]);
        }
        else {
            OneToManyMatrix[f] = [[e, attr]];
        }
    };

    const addToMtoEntity = (e: keyof ED, fs: Array<keyof ED>) => {
        for (const f of fs) {
            if (!OneToManyOnEntityMatrix[f]) {
                OneToManyOnEntityMatrix[f] = [e];
            }
            else {
                OneToManyOnEntityMatrix[f]?.push(e);
            }
        }
    };

    for (const entity in schema) {
        if (['operEntity', 'modiEntity', 'userEntityGrant'].includes(entity)) {
            continue;       // 系统功能性数据，不用处理
        }
        const { attributes } = schema[entity];
        for (const attr in attributes) {
            if (attributes[attr].type === 'ref') {
                addToMto(entity, attributes[attr].ref as keyof ED, attr);
            }
            else if (attr === 'entity') {
                if (attributes[attr].ref) {
                    addToMtoEntity(entity, attributes[attr].ref as Array<keyof ED>);
                }
                else if (process.env.NODE_ENV === 'development') {
                    console.warn(`${entity}的entity反指指针找不到有效的对象`);
                }
            }
        }
    }

    // 当删除一时，要确认多上面没有指向一的数据
    const entities = union(Object.keys(OneToManyMatrix), Object.keys(OneToManyOnEntityMatrix));
    for (const entity of entities) {
        checkers.push({
            entity: entity as keyof ED,
            action: 'remove',
            type: 'logical',
            checker: (operation, context, option) => {
                const promises: Promise<void>[] = [];
                if (OneToManyMatrix[entity]) {
                    for (const otm of OneToManyMatrix[entity]!) {
                        const [e, attr] = otm;
                        const proj = {
                            id: 1,
                            [attr]: 1,
                        };
                        const filter = operation.filter && {
                            [attr.slice(0, attr.length - 2)]: operation.filter
                        }
                        const result = context.select(e, {
                            data: proj,
                            filter,
                            indexFrom: 0,
                            count: 1
                        }, { dontCollect: true });
                        if (result instanceof Promise) {
                            promises.push(
                                result.then(
                                    ([row]) => {
                                        if (row) {
                                            const err = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${e as string}」关联的行`);
                                            err.addData(e, [row]);
                                            throw err;
                                        }
                                    }
                                )
                            );
                        }
                        else {
                            const [row] = result;
                            if (row) {
                                const err = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${e as string}」关联的行`);
                                err.addData(e, [row]);
                                throw err;
                            }
                        }
                    }
                }
                if (OneToManyOnEntityMatrix[entity]) {
                    for (const otm of OneToManyOnEntityMatrix[entity]!) {
                        const proj = {
                            id: 1,
                            entity: 1,
                            entityId: 1,
                        };
                        const filter = operation.filter && {
                            [entity]: operation.filter
                        }
                        const result = context.select(otm, {
                            data: proj,
                            filter,
                            indexFrom: 0,
                            count: 1
                        }, { dontCollect: true });
                        if (result instanceof Promise) {
                            promises.push(
                                result.then(
                                    ([row]) => {
                                        if (row) {
                                            const e = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${otm as string}」关联的行`);
                                            e.addData(otm, [row]);
                                            throw e;
                                        }
                                    }
                                )
                            );
                        }
                        else {
                            const [row] = result;
                            if (row) {
                                const record = {
                                    a: 's',
                                    d: {
                                        [otm]: {
                                            [row.id!]: row,
                                        }
                                    }
                                } as SelectOpResult<ED>;
                                const e = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${otm as string}」关联的行`);
                                e.addData(otm, [row]);
                                throw e;
                            }
                        }
                    }
                }
                if (promises.length > 0) {
                    return Promise.all(promises).then(
                        () => undefined
                    );
                }
            }
        })
    }

    // 注入声明的cascade删除时的外键处理动作
    for (const entity in authDict) {
        const { cascadeRemove } = authDict[entity]!;
        if (cascadeRemove) {
            const entitiesOnEntityAttr = [] as Array<keyof ED>;
            let hasAllEntity = false;
            for (const attr in cascadeRemove) {
                if (attr === '@entity') {
                    hasAllEntity = true;
                    continue;
                }
                const rel = judgeRelation(schema, entity, attr);
                if (rel === 2) {
                    entitiesOnEntityAttr.push(attr);
                    checkers.push({
                        entity: attr,
                        action: 'remove',
                        type: 'logical',
                        priority: REMOVE_CASCADE_PRIORITY,       // 这个checker必须在检查外键不为空的checker之前执行，否则无法完成
                        checker: (operation, context) => {
                            const { filter } = operation;
                            if (cascadeRemove[attr] === 'remove') {
                                return context.operate(entity, {
                                    id: generateNewId(),
                                    action: 'remove',
                                    data: {},
                                    filter: filter ? {
                                        [attr]: filter,
                                    } : undefined,
                                }, { dontCollect: true });
                            }
                            return context.operate(entity, {
                                id: generateNewId(),
                                action: 'update',
                                data: {
                                    entity: null,
                                    entityId: null,
                                },
                                filter: filter ? {
                                    [attr]: filter,
                                } : undefined,
                            }, { dontCollect: true });

                        }
                    });
                }
                else {
                    assert(typeof rel === 'string');
                    checkers.push({
                        entity: rel,
                        action: 'remove',
                        type: 'logical',
                        priority: REMOVE_CASCADE_PRIORITY,       // 这个checker必须在检查外键不为空的checker之前执行，否则无法完成
                        checker: (operation, context) => {
                            const { filter } = operation;
                            if (cascadeRemove[attr] === 'remove') {
                                return context.operate(entity, {
                                    id: generateNewId(),
                                    action: 'remove',
                                    data: {},
                                    filter: filter ? {
                                        [attr]: filter,
                                    } : undefined,
                                }, { dontCollect: true });
                            }
                            return context.operate(entity, {
                                id: generateNewId(),
                                action: 'update',
                                data: {
                                    [`${attr}Id`]: null,
                                },
                                filter: filter ? {
                                    [attr]: filter,
                                } : undefined,
                            }, { dontCollect: true });
                        }
                    });
                }
            }

            if (hasAllEntity) {
                const { attributes } = schema[entity];
                const { ref } = attributes.entity;
                const restEntities = difference(ref, entitiesOnEntityAttr);
                for (const e of restEntities) {
                    checkers.push({
                        entity: e,
                        action: 'remove',
                        type: 'logical',
                        priority: REMOVE_CASCADE_PRIORITY,       // 这个checker必须在检查外键不为空的checker之前执行，否则无法完成
                        checker: (operation, context) => {
                            const { filter } = operation;
                            if (cascadeRemove['@entity'] === 'remove') {
                                return context.operate(entity, {
                                    id: generateNewId(),
                                    action: 'remove',
                                    data: {},
                                    filter: filter ? {
                                        [e]: filter,
                                    } : undefined,
                                }, { dontCollect: true });
                            }
                            return context.operate(entity, {
                                id: generateNewId(),
                                action: 'update',
                                data: {
                                    entity: null,
                                    entityId: null,
                                },
                                filter: filter ? {
                                    [e]: filter,
                                } : undefined,
                            }, { dontCollect: true });
                        }
                    });
                }
            }
        }
    }

    return checkers;
}