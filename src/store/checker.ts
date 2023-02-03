import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import {
    AuthDefDict, CascadeRelationItem, Checker, CreateTriggerInTxn,
    EntityDict, OperateOption, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn, RelationHierarchy, SelectOpResult
} from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';
import { intersection, uniq, difference } from '../utils/lodash';
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
                    const filter = data instanceof Array ? {
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
        if (iter === paths.length - 1) {
            if (relation === 2) {
                const filterMaker = translateRelationFilter(paths[iter]);
                return (userId) => {
                    const filter = filterMaker(userId)!;
                    assert(filter.id);
                    return {
                        entity: paths[iter],
                        entityId: filter.id,
                    };
                }
            }
            assert(typeof relation === 'string');
            const filterMaker = translateRelationFilter(relation);
            return (userId) => {
                const filter = filterMaker(userId)!;

                assert(filter.id);
                return {
                    [`${paths[iter]}Id`]: filter.id,
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

/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema 
 * @returns 
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
export function createRemoveCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
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
        if (['operEntity', 'modiEntity'].includes(entity)) {
            continue;       // OperEntity和ModiEntity是系统数据，不用处理
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
    const entities = intersection(Object.keys(OneToManyMatrix), Object.keys(OneToManyOnEntityMatrix));
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
                            [attr.slice(0, attr.length -2)]: operation.filter
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
                                            const record = {
                                                a: 's',
                                                d: {
                                                    [e]: {
                                                        [row.id!]: row,
                                                    }
                                                }
                                            } as SelectOpResult<ED>;
                                            throw new OakRowInconsistencyException(record, `您无法删除存在有效数据「${e as string}」关联的行`);
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
                                        [e]: {
                                            [row.id!]: row,
                                        }
                                    }
                                } as SelectOpResult<ED>;
                                throw new OakRowInconsistencyException(record, `您无法删除存在有效数据「${e as string}」关联的行`);
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
                                            const record = {
                                                a: 's',
                                                d: {
                                                    [otm]: {
                                                        [row.id!]: row,
                                                    }
                                                }
                                            } as SelectOpResult<ED>;
                                            throw new OakRowInconsistencyException(record, `您无法删除存在有效数据「${otm as string}」关联的行`);
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
                                throw new OakRowInconsistencyException(record, `您无法删除存在有效数据「${otm as string}」关联的行`);
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

    return checkers;
}