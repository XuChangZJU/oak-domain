import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakDataException, OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import { CascadeRelationItem, Checker, CreateTriggerInTxn, EntityDict, ExpressionRelationChecker, ExpressionTask, ExpressionTaskCombination, OperateOption, RefOrExpression, RelationHierarchy, ReverseCascadeRelationHierarchy, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';
import { intersection, uniq } from '../utils/lodash';
import { judgeRelation } from './relation';

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
                    const result2 = await Promise.all(
                        exprResult.map(
                            (e1) => Promise.all(
                                e1.map(
                                    async (e2) => {
                                        const { entity: expressionEntity, expr, filter: expressionFilter } = e2;
                                        const [result] = await context.select(expressionEntity, {
                                            data: {
                                                $expr: expr,
                                            },
                                            filter: expressionFilter,
                                        }, Object.assign({}, option, { dontCollect: true }));
                                        return result ? result.$expr as boolean : false;
                                    }
                                )
                            )
                        )
                    );
                    // exprResult外层是or，里层是and关系
                    const isLegal = result2.find(
                        (r1) => r1.every(
                            (r2) => r2 === true
                        )
                    );
                    if (!isLegal) {
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
                    const result2 = exprResult.map(
                        (e1) => e1.map(
                            (e2) => {
                                const { entity: expressionEntity, expr, filter: expressionFilter } = e2;
                                const [result] = context.select(expressionEntity, {
                                    data: {
                                        $expr: expr,
                                    },
                                    filter: expressionFilter,
                                }, Object.assign({}, option, { dontCollect: true }));
                                return result ? result.$expr as boolean : false;
                            }
                        )
                    );
                    // exprResult外层是or，里层是and关系
                    const isLegal = result2.find(
                        (r1) => r1.every(
                            (r2) => r2 === true
                        )
                    );
                    if (!isLegal) {
                        // 条件判定为假，抛异常
                        if (type === 'expression') {
                            throw new OakRowInconsistencyException(undefined, errMsg);
                        }
                        else {
                            throw new OakUserUnpermittedException(errMsg);
                        }
                    }
                }
            };
        }
        default: {
            assert(false);
        }
    }
}


function buildReverseHierarchyMap(relationHierarchy: RelationHierarchy<any>) {
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
    return reverseHierarchy;
}

function translateSingleCascadeRelationItem<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    lch: CascadeRelationItem,
    entity2: keyof ED,
    entityId: string,
    userId: string): ExpressionTask<ED, keyof ED> {
    const { cascadePath, relations } = lch;
    const paths = cascadePath.split('.');

    const translateFilterIter = <T extends keyof ED>(entity: keyof ED, iter: number): ED[T]['Selection']['filter'] => {
        const relation = judgeRelation(schema, entity, paths[iter]);
        if (iter === paths.length - 1) {
            if (relation === 2) {
                return {
                    entity: paths[iter],
                    entityId: {
                        $in: {
                            entity: `user${firstLetterUpperCase(paths[iter])}`,
                            data: {
                                [`${paths[iter]}Id`]: 1,
                            },
                            filter: {
                                userId,
                                relation: {
                                    $in: relations,
                                },
                            },
                        },
                    }
                };
            }
            assert(typeof relation === 'string');
            return {
                [`${paths[iter]}Id`]: {
                    $in: {
                        entity: `user${firstLetterUpperCase(relation)}`,
                        data: {
                            [`${relation}Id`]: 1,
                        },
                        filter: {
                            userId,
                            relation: {
                                $in: relations,
                            },
                        },
                    },
                }
            };
        }
        else {
            const subFilter = translateFilterIter(paths[iter], iter + 1);
            if (iter === 0) {
                return {
                    [paths[iter]]: subFilter,
                    id: entityId,
                };
            }
            return {
                [paths[iter]]: subFilter,
            };
        }
    };
    const filter = translateFilterIter(entity2, 0);
    return {
        entity: entity2,
        filter,
        expr: {
            $gt: [{
                '#attr': '$$createAt$$',
            }, 0]
        },
    };
}

function translateFromCascadeRelationHierarchy<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    legalCascadeHierarchies: CascadeRelationItem | (CascadeRelationItem | CascadeRelationItem[])[],
    entity: keyof ED,
    entityId: string,
    userId: string): ExpressionTaskCombination<ED> {
    if (legalCascadeHierarchies instanceof Array) {
        return legalCascadeHierarchies.map(
            ele => {
                if (ele instanceof Array) {
                    return ele.map(
                        ele2 => translateSingleCascadeRelationItem(schema, ele2, entity, entityId, userId)
                    );
                }
                return [translateSingleCascadeRelationItem(schema, ele, entity, entityId, userId)];
            }
        )
    }
    else {
        return [[translateSingleCascadeRelationItem(schema, legalCascadeHierarchies, entity, entityId, userId)]];
    }
}

function makeRelationExpressionCombination<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    entity: keyof ED,
    entityId: string,
    userId: string,
    relation: string,
    reverseHierarchy?: Record<string, string[]>,
    reverseCascadeRelationHierarchy?: ReverseCascadeRelationHierarchy<any>,
) {
    const userEntityName = `user${firstLetterUpperCase(entity as string)}`;
    const entityIdAttr = `${entity as string}Id`;
    const legalRelations = reverseHierarchy && reverseHierarchy[relation];
    const legalCascadeHierarchies = reverseCascadeRelationHierarchy && reverseCascadeRelationHierarchy[relation];
    if (!legalRelations && !legalCascadeHierarchies) {
        return undefined;
    }
    if (legalRelations?.length === 0) {
        throw new Error('这是不应该跑出来的情况，请杀程序员祭天');
    }
    const expressionCombination: ExpressionTaskCombination<ED> = [];
    if (legalRelations && legalRelations.length > 0) {
        expressionCombination.push([{
            entity: userEntityName as keyof ED,
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
        }]);
    }
    if (legalCascadeHierarchies) {
        expressionCombination.push(...translateFromCascadeRelationHierarchy<ED>(
            schema,
            legalCascadeHierarchies,
            entity,
            entityId,
            userId!
        ));
    }
    return expressionCombination;
}

export function createRelationHierarchyCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        const { relationHierarchy, reverseCascadeRelationHierarchy } = schema[entity];
        if (relationHierarchy || reverseCascadeRelationHierarchy) {
            const reverseHierarchy = relationHierarchy && buildReverseHierarchyMap(relationHierarchy);
            const userEntityName = `user${firstLetterUpperCase(entity)}`;
            const entityIdAttr = `${entity}Id`;
            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'create',
                type: 'expressionRelation',
                expression: <T2 extends keyof ED>(operation: any, context: Cxt) => {
                    const { data } = operation as ED[keyof ED]['Create'];
                    assert(!(data instanceof Array));
                    const { relation, [entityIdAttr]: entityId } = data;
                    const userId = context.getCurrentUserId();
                    const schema = context.getSchema();
                    return makeRelationExpressionCombination(schema, entity, entityId, userId!, relation, reverseHierarchy, reverseCascadeRelationHierarchy);
                },
                errMsg: '越权操作',
            });
            checkers.push({
                entity: userEntityName as keyof ED,
                action: 'remove',
                type: 'expressionRelation',
                expression: <T2 extends keyof ED>(operation: any, context: Cxt) => {
                    const userId = context.getCurrentUserId();
                    const { filter } = operation as ED[keyof ED]['Remove'];
                    const makeFilterFromRows = (rows: Partial<ED[T2]['Schema']>[]) => {
                        const relations = uniq(rows.map(ele => ele.relation));
                        const entityIds = uniq(rows.map(ele => ele[entityIdAttr]));
                        assert(entityIds.length === 1, `在回收${userEntityName}上权限时，单次回收涉及到了不同的对象，此操作不被允许`);
                        const entityId = entityIds[0]!;
                        const schema = context.getSchema();
                        const exprComb = relations.map(
                            (relation) => makeRelationExpressionCombination(
                                schema,
                                entity,
                                entityId,
                                userId!,
                                relation!,
                                reverseHierarchy,
                                reverseCascadeRelationHierarchy,
                            )
                        );
                        //  对每个relation求出其相应的exprComb，此操作对多行进行expr，需要对之进行类似于笛卡尔积的相乘
                        const result = exprComb.reduce(
                            (accu, current) => {
                                if (!current) {
                                    return accu;
                                }
                                const result2 = [] as ExpressionTaskCombination<ED>;
                                for (const c of current) {
                                    for (const a of accu!) {
                                        result2.push(a.concat(c));
                                    }
                                }
                                return result2;
                            },
                            [[]] as ExpressionTaskCombination<ED>,
                        );

                        return result && result.length > 0 ? result : undefined;
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