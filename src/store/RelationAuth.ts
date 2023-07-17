import assert from "assert";
import { EntityDict } from "../base-app-domain";
import { OakException, OakUserUnpermittedException, StorageSchema } from "../types";
import { AuthCascadePath, EntityDict as BaseEntityDict, AuthDeduceRelationMap } from "../types/Entity";
import { AsyncContext } from "./AsyncRowStore";
import { addFilterSegment } from "./filter";
import { judgeRelation } from "./relation";
import { SyncContext } from "./SyncRowStore";
import { readOnlyActions } from '../actions/action';
import { difference } from '../utils/lodash';

/**
 * check某个entity上是否有允许actions操作（数据为data，条件为filter）的relation。
 * 算法的核心思想是：
 * 1、根据filter（create动作根据data）的外键来缩小可能的父级对象存在的relation的路径。
 *      比如a上面的查询条件是: { b: {c: { dId: '11111' }}}，则relation应落在a.b.c.d路径（或更长的）上
 *      这个递归过程中可能会有分支出现，但还是能缩减搜索范围
 * 2、如果是create动作，可能会带有一个新建的userRelation
 */
type CheckRelationResult = {
    relationId?: string;
    relativePath: string;
};

export class RelationAuth<ED extends EntityDict & BaseEntityDict>{
    private actionCascadePathGraph: AuthCascadePath<ED>[];
    private relationCascadePathGraph: AuthCascadePath<ED>[];
    private authDeduceRelationMap: AuthDeduceRelationMap<ED>;
    private schema: StorageSchema<ED>;
    /**
     * 根据当前操作条件，查找到满足actions（overlap关系）的relationId和relativePath
     */
    private relationalChecker: {
        [T in keyof ED]?: (
            userId: string,
            actions: ED[T]['Action'][],
            data?: ED[T]['Operation']['data'],
            filter?: ED[T]['Selection']['filter'],
            userRelations?: Array<ED['userRelation']['OpSchema']>,
        ) => (<Cxt extends AsyncContext<ED> | SyncContext<ED>>(context: Cxt, oneIsEnough?: boolean) => CheckRelationResult[] | Promise<CheckRelationResult[]>) | string;
    };
    private selectFreeEntities: (keyof ED)[];


    private constructRelationalChecker() {
        const pathGroup: {
            [T in keyof ED]?: AuthCascadePath<ED>[];
        } = {};
        this.actionCascadePathGraph.forEach(
            (path) => {
                const entity = path[0];
                if (pathGroup[entity]) {
                    pathGroup[entity]?.push(path);
                }
                else {
                    pathGroup[entity] = [path];
                }
            }
        );
        /**
         * 根据filter条件，尽可能寻找最靠近根结点的auth路径。并将不可能的路径排除
         * @param auths 
         * @param entity 
         * @param filter 
         * @param path 
         */
        type Anchor = {
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
            relativePath: string;
        };

        const findHighestAnchors = (entity: keyof ED, filter: NonNullable<ED[keyof ED]['Selection']['filter']>, path: string, excludePaths: string[]): Anchor[] => {
            const anchors = [] as Anchor[];
            for (const attr in filter) {
                if (attr === '$and') {
                    filter[attr].forEach(
                        (ele: ED[keyof ED]['Selection']['filter']) => anchors.push(...findHighestAnchors(entity, ele!, path, excludePaths))
                    );
                    continue;
                }
                else if (attr.startsWith('$') || attr.startsWith('#')) {
                    // todo $or会发生什么？by Xc
                    continue;
                }
                const rel = judgeRelation(this.schema, entity, attr);
                if (rel === 2) {
                    const path2 = path ? `${path}.${attr}` : attr;
                    anchors.push(...findHighestAnchors(attr, filter[attr], path2, excludePaths));

                    const { attributes } = this.schema[entity];
                    const { ref } = attributes.entity;
                    assert(ref instanceof Array);
                    ref.forEach(
                        (refEntity) => {
                            if (refEntity !== attr) {
                                const refEntityPath = path ? `${path}.${refEntity}` : refEntity;
                                excludePaths.push(refEntityPath);
                            }
                        }
                    );
                }
                else if (typeof rel === 'string') {
                    const path2 = path ? `${path}.${attr}` : attr;
                    anchors.push(...findHighestAnchors(rel, filter[attr], path2, excludePaths));
                }
                else if (rel === 1) {
                    if (attr === 'entity' && (pathGroup[filter.entity] || filter.entity === 'user')) {
                        const nextPath = path ? `${path}.${filter.entity as string}` : filter.entity;
                        if (filter.entityId) {
                            anchors.push({
                                entity: filter.entity,
                                filter: {
                                    id: filter.entityId,
                                },
                                relativePath: nextPath,
                            });
                        }
                        const { attributes } = this.schema[entity];
                        const { ref } = attributes.entity;
                        assert(ref instanceof Array);
                        ref.forEach(
                            (refEntity) => {
                                if (refEntity !== filter.entity) {
                                    const refEntityPath = path ? `${path}.${refEntity}` : refEntity;
                                    excludePaths.push(refEntityPath);
                                }
                            }
                        );
                    }
                    else if (this.schema[entity].attributes[attr as any]?.type === 'ref') {
                        const { ref } = this.schema[entity].attributes[attr as any];
                        assert(typeof ref === 'string');
                        if (pathGroup[ref] || ref === 'user') {
                            anchors.push({
                                entity: ref,
                                filter: {
                                    id: filter[attr],
                                },
                                relativePath: path ? `${path}.${attr.slice(0, attr.length - 2)}` : attr.slice(0, attr.length - 2)
                            });
                        }
                    }
                }
            }
            if (anchors.length > 0) {
                return anchors;
            }
            if (filter.id) {
                // 直接以id作为查询目标
                return [{
                    entity,
                    filter: {
                        id: filter.id,
                    },
                    relativePath: path,
                }];
            }
            return [];
        };

        Object.keys(pathGroup).forEach(
            (entity) => {
                const authCascadePaths = pathGroup[entity]!;
                this.relationalChecker[entity as keyof ED] = (
                    userId: string,
                    actions: ED[keyof ED]['Action'][],
                    data?: ED[keyof ED]['Operation']['data'],
                    filter?: ED[keyof ED]['Selection']['filter'],
                    userRelations?: Array<ED['userRelation']['OpSchema']>,
                ) => {
                    const filter2 = filter || data as ED[keyof ED]['Selection']['filter'];
                    if (!filter2) {
                        // 到这里如果没有限定条件，可以直接报错。要放在这里的原因是对root的判断太深，设计上可能有点问题 by Xc 20230717
                        return '没有限定查询条件，无法进行合法的权限判定';
                    }
                    const excludePaths: string[] = [];
                    const anchors = findHighestAnchors(entity, filter2 as NonNullable<ED[keyof ED]['Selection']['filter']>, '', excludePaths);
                    if (anchors.length === 0) {
                        return '本次查询找不到锚定权限的入口，请确认查询条件合法';
                    }
                    anchors.sort(
                        (a1, a2) => a2.relativePath.length - a1.relativePath.length
                    );

                    // 将这些找到的锚点和authCascadePaths进行锚定，确认userRelation的搜索范围
                    const filters = authCascadePaths.filter(
                        (path) => {
                            // 被entity的外键连接所排队的路径，这个非常重要，否则像extraFile这样的对象会有过多的查询路径
                            for (const excludePath of excludePaths) {
                                if (path[1].startsWith(`${excludePath}.`) || path[1] === excludePath) {
                                    return false;
                                }
                            }
                            return true;
                        }
                    ).map(
                        (path) => {
                            // 这里anchor的relativePath按长度倒排，所以找到的第一个匹配关系应该就是最准确的
                            const relatedAnchor = anchors.find(
                                (anchor) => path[1].startsWith(`${anchor.relativePath}.`)
                                    || path[1] === anchor.relativePath
                                    || !anchor.relativePath     // relativePath如果是'', 所有的路径都成立
                            );
                            if (relatedAnchor) {
                                const { entity, relativePath, filter } = relatedAnchor;
                                const restPath = relativePath === path[1] ? '' : relativePath === '' ? path[1] : path[1].slice(relativePath.length + 1);
                                if (restPath === '') {
                                    // 处理一种特殊情况，如果根结点是create，则userRelation或者userId应该附着在创建的信息上
                                    if (actions[0] === 'create' && actions.length === 1) {
                                        if (path[3]) {
                                            if (userRelations && userRelations.length > 0) {
                                                const relationIds = userRelations.map(
                                                    (userRelation) => {
                                                        assert(!(userRelation instanceof Array), '创建对象同时创建userRelation请勿将多条relation合并传入');
                                                        const { relationId } = userRelation;
                                                        return relationId;
                                                    }
                                                );
                                                return {
                                                    relativePath: path[1],
                                                    relationIds,
                                                    path,
                                                };
                                            }
                                        }
                                        else {
                                            if (filter!.id === userId) {
                                                return {
                                                    relativePath: path[1],
                                                    path,
                                                };
                                            }
                                        }
                                    }
                                    if (path[3]) {
                                        return {
                                            relativePath: path[1],
                                            path,
                                            filter: {
                                                entity,
                                                entityId: filter!.id,
                                            },
                                        };
                                    }
                                    if (userId === filter!.id) {
                                        // 说明userId满足条件，直接返回relativePath
                                        return {
                                            relativePath: path[1],
                                            path,
                                        };
                                    }
                                    return undefined;
                                }
                                const restPaths = restPath.split('.');

                                const makeFilterIter = (entity2: keyof ED, idx: number, filter2: ED[keyof ED]['Selection']['filter']): {
                                    relativePath: string;
                                    path: AuthCascadePath<ED>;
                                    filter: ED[keyof ED]['Selection']['filter'];
                                } => {
                                    // 这里如果不是relation关系，则最后一项是指向user的外键名，否则最后一项就是最后一层的对象，有区别
                                    if (idx === restPaths.length - 1 && !path[3]) {
                                        return {
                                            relativePath: path[1],
                                            path,
                                            filter: {
                                                [`${restPaths[idx]}Id`]: userId,
                                                ...filter2!,
                                            },
                                        };
                                    }
                                    else if (idx === restPaths.length && path[3]) {
                                        return {
                                            relativePath: path[1],
                                            path,
                                            filter: {
                                                entity: entity2,
                                                entityId: filter2!.id,
                                            },
                                        };
                                    }
                                    const attr = restPaths[idx];
                                    const rel = judgeRelation(this.schema, entity2, attr);
                                    if (rel === 2) {
                                        return makeFilterIter(attr, idx + 1, {
                                            id: {
                                                $in: {
                                                    entity: entity2,
                                                    data: {
                                                        entityId: 1,
                                                    },
                                                    filter: {
                                                        entity: attr,
                                                        ...filter2,
                                                    },
                                                }
                                            }
                                        });
                                    }
                                    assert(typeof rel === 'string');
                                    return makeFilterIter(rel, idx + 1, {
                                        id: {
                                            $in: {
                                                entity: entity2,
                                                data: {
                                                    [`${attr}Id`]: 1,
                                                },
                                                filter: filter2,
                                            },
                                        },
                                    });
                                };

                                return makeFilterIter(entity, 0, filter);
                            }
                        }
                    ).filter(
                        ele => !!ele
                    ) as {
                        relativePath: string;                       // （当前目标对象）与将用于测试的cascadePath的destEntity的相对路径
                        path: AuthCascadePath<ED>;                  //  对象的AuthCascadePath
                        filter?: ED[keyof ED]['Selection']['filter'];       //  如果有relation，是对userRelation的查询条件，没有relation则是对path所标定的源对象的查询条件，两者都没有则说明查询条件上已经标定了源对象的userId了
                        relationIds?: string[];                     // 如果有值表示userRelation是本动作所创建出来的，relationIds是相对应的relationIds
                    }[];

                    assert(filters.length > 0, `对${entity as string}进行${actions.join(',')}操作时，找不到有效的锚定权限搜索范围`);
                    if (process.env.NODE_ENV === 'development' && filters.length > 5) {
                        console.warn(`对${entity as string}进行${actions.join(',')}操作时发现了${filters.length}条的权限可能路径，请优化查询条件或者在relation中约束此对象可能的权限路径范围`);
                    }

                    return (context, oneIsEnough) => {
                        if (oneIsEnough) {
                            const sureRelativePaths = filters.filter(
                                ele => !ele.filter && !ele.relationIds
                            );
                            if (sureRelativePaths.length > 0) {
                                return sureRelativePaths.map(
                                    ele => ({
                                        relativePath: ele.relativePath
                                    })
                                );
                            }
                        }

                        const checkRelationResults: CheckRelationResult[] = [];
                        const result = filters.map(
                            ({ path, filter, relativePath, relationIds }) => {
                                if (filter) {
                                    const [d, p, s, ir] = path;
                                    if (ir) {
                                        const urs = context.select('userRelation', {
                                            data: {
                                                id: 1,
                                                relationId: 1,
                                            },
                                            filter: {
                                                userId,
                                                ...filter,
                                                relationId: {
                                                    $in: {
                                                        entity: 'actionAuth',
                                                        data: {
                                                            relationId: 1,
                                                        },
                                                        filter: {
                                                            path: p,
                                                            destEntity: d,
                                                            deActions: {
                                                                $overlaps: actions,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        }, { dontCollect: true });
                                        if (urs instanceof Promise) {
                                            return urs.then(
                                                (urs2) => urs2.map(
                                                    ele => ele.relationId!
                                                )
                                            ).then(
                                                (relationIds) => checkRelationResults.push(...relationIds.map(
                                                    (relationId) => ({
                                                        relationId,
                                                        relativePath
                                                    })
                                                ))
                                            );
                                        }
                                        checkRelationResults.push(
                                            ...urs.map(
                                                ele => ({
                                                    relationId: ele.relationId,
                                                    relativePath
                                                })
                                            ));
                                        return;
                                    }
                                    // 通过userId关联，直接查有没有相应的entity
                                    const result2 = context.select(s, {
                                        data: {
                                            id: 1,
                                        },
                                        filter,
                                    }, { dontCollect: true });
                                    if (result2 instanceof Promise) {
                                        return result2.then(
                                            (e2) => {
                                                if (e2.length > 0) {
                                                    checkRelationResults.push({
                                                        relativePath,
                                                    });
                                                }
                                            }
                                        );
                                    }
                                    if (result2.length > 0) {
                                        checkRelationResults.push({
                                            relativePath,
                                        });
                                    }
                                    return;
                                }
                                if (relationIds) {
                                    const [d, p, s, ir] = path;
                                    assert(ir && relationIds.length > 0);
                                    // 既要检查在此entity上有没有创建这些relation的权限，还要检查在destEntity上有没有相应的操作权限
                                    const result2 = [
                                        context.select('actionAuth', {
                                            data: {
                                                id: 1,
                                            },
                                            filter: {
                                                relationId: {
                                                    $in: relationIds,
                                                },
                                                deActions: {
                                                    $contains: 'create',
                                                },
                                                path: '',
                                                destEntity: s as string,
                                            }
                                        }, { dontCollect: true }),
                                        context.select('actionAuth', {
                                            data: {
                                                id: 1,
                                                relationId: 1,
                                            },
                                            filter: {
                                                relationId: {
                                                    $in: relationIds,
                                                },
                                                deActions: {
                                                    $overlaps: actions,
                                                },
                                                path: p,
                                                destEntity: d as string,
                                            },
                                        }, { dontCollect: true })
                                    ];

                                    if (result2[0] instanceof Promise) {
                                        return Promise.all(result2).then(
                                            ([createAas, aas]) => {
                                                if (createAas.length === relationIds.length && aas.length > 0) {
                                                    // create的权限数量必须和relationIds的数量一致，而本次操作的权限数量只要有一个就可以
                                                    const legalRelationIds = aas.map(ele => ele.relationId!);
                                                    checkRelationResults.push(
                                                        ...legalRelationIds.map(
                                                            (relationId) => ({
                                                                relationId,
                                                                relativePath,
                                                            })
                                                        )
                                                    );
                                                }
                                            }
                                        );
                                    }
                                    const [createAas, aas] = result2 as ED['actionAuth']['OpSchema'][][];
                                    if (createAas.length === relationIds.length && aas.length > 0) {
                                        // create的权限数量必须和relationIds的数量一致，而本次操作的权限数量只要有一个就可以
                                        const legalRelationIds = aas.map(ele => ele.relationId!);
                                        checkRelationResults.push(
                                            ...legalRelationIds.map(
                                                (relationId) => ({
                                                    relationId,
                                                    relativePath,
                                                })
                                            )
                                        );
                                    }
                                    return;
                                }
                                // 最后一种情况，根据条件已经判定了操作可行，只要检查relativePath上的userId是不是成立
                                checkRelationResults.push({
                                    relativePath,
                                });
                            }
                        );
                        if (result[0] instanceof Promise) {
                            return Promise.all(result).then(
                                () => checkRelationResults
                            );
                        }
                        return checkRelationResults;
                    };
                };
            }
        );
    }

    constructor(schema: StorageSchema<ED>,
        actionCascadePathGraph: AuthCascadePath<ED>[],
        relationCascadePathGraph: AuthCascadePath<ED>[],
        authDeduceRelationMap: AuthDeduceRelationMap<ED>,
        selectFreeEntities: (keyof ED)[]) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities;
        this.relationalChecker = {};
        this.authDeduceRelationMap = Object.assign({}, authDeduceRelationMap, {
            modi: 'entity',
        });
        this.constructRelationalChecker();
    }

    /**
     * 对Operation而言，找到最顶层对象的对应权限所在的relation，再查找actionAuth中其它子对象有无相对路径授权
     * 如一个cascade更新目标是(entity: a, action: 'update')：{
     *      b: {
     *          action: 'update',
     *          data: {
     *              c: {
     *                  action: 'update',
     *              },
     *          },
     *      },
     *      d$entity: [{
     *          action: 'create',
     *          data: {},
     *      }]
     * }
     * 则应检查的顶层对象是c，而b:update, a:update以及d:create都应该在c所对应权限的派生路径上
     * @param entity 
     * @param operation 
     */
    private destructCascadeOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation']): {
        root: {
            entity: keyof ED;
            action: ED[keyof ED]['Action'];
            data: ED[keyof ED]['Operation']['data'];
            filter: ED[keyof ED]['Selection']['filter'];
        };
        children: Array<{
            entity: keyof ED;
            action: ED[keyof ED]['Action'];
            relativePath: string;
        }>;
        userRelations: Array<ED['userRelation']['OpSchema']>;
    } {
        const children: Array<{
            entity: keyof ED;
            action: ED[keyof ED]['Action'];
            relativePath: string;
        }> = [];
        const userRelations: Array<ED['userRelation']['OpSchema']> = [];

        const appendChildPath = (path: string) => {
            assert(userRelations.length === 0, 'userRelation必须在创建动作的最高层');
            children.forEach(
                (child) => {
                    if (child.relativePath) {
                        child.relativePath = `${child.relativePath}.${path}`;
                    }
                    else {
                        child.relativePath = path;
                    }
                }
            );
        };

        /**
         * 递归分解operation直到定位出最终的父对象，以及各子对象与之的相对路径。
         * 此函数逻辑和CascadeStore中的destructOperation相似
         * @param entity 
         * @param operation 
         * @param parentFilter 
         */
        const destructFn = (
            entity: keyof ED,
            operation: ED[keyof ED]['Operation'],
            relativeRootPath: string,
            parentFilter?: ED[keyof ED]['Selection']['filter']): {
                entity: keyof ED;
                action: ED[keyof ED]['Action'];
                data: ED[keyof ED]['Operation']['data'];
                filter: ED[keyof ED]['Selection']['filter'];
            } => {
            const { action, data, filter } = operation;
            let root: {
                entity: keyof ED;
                action: ED[keyof ED]['Action'];
                data: ED[keyof ED]['Operation']['data'];
                filter: ED[keyof ED]['Selection']['filter'];
            } = {
                entity,
                action,
                data,
                filter: addFilterSegment(filter, parentFilter),
            };
            assert(!(data instanceof Array));       // createMulti这种情况实际中不会出现
            let changeRoot = false;
            for (const attr in data) {
                const rel = judgeRelation(this.schema, entity, attr);
                if (rel === 2) {
                    assert(!this.authDeduceRelationMap[attr], 'deduceRelation的entity只应当出现在一对多的路径上');
                    assert(!changeRoot, 'cascadeUpdate不应产生两条父级路径');
                    assert(!relativeRootPath, 'cascadeUpdate不应产生两条父级路径');
                    changeRoot = true;
                    // 基于entity/entityId的many-to-one
                    const operationMto = data[attr];
                    const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                    let parentFilter2: ED[keyof ED]['Selection']['filter'] = undefined;
                    if (actionMto === 'create') {
                    }
                    else if (action === 'create') {
                        const { entityId: fkId, entity } = data;
                        assert(typeof fkId === 'string' || entity === attr);
                        if (filterMto?.id) {
                            assert(filterMto.id === fkId);
                        }
                        else {
                            parentFilter2 = {
                                id: fkId,
                            };
                        }
                    }
                    else {
                        // 剩下三种情况都是B中的filter的id来自A中row的entityId
                        assert(!data.hasOwnProperty('entityId') && !data.hasOwnProperty('entity'));
                        if (filterMto?.id) {
                            // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                            assert(typeof filterMto.id === 'string');
                        }
                        else if (filter!.entity === attr && filter!.entityId) {
                            parentFilter2 = {
                                id: filter!.entityId,
                            };
                        }
                        else if (filter![attr]) {
                            parentFilter2 = filter![attr];
                        }
                        else {
                            parentFilter2 = {
                                id: {
                                    $in: {
                                        entity,
                                        data: {
                                            entityId: 1,
                                        },
                                        filter: addFilterSegment({
                                            entity: attr,
                                        } as any, filter),
                                    }
                                },
                            };
                        }
                    }

                    appendChildPath(attr);
                    children.push({
                        entity,
                        action,
                        relativePath: attr,
                    });
                    root = destructFn(attr, operationMto, '', parentFilter2);
                }
                else if (typeof rel === 'string') {
                    assert(!this.authDeduceRelationMap[attr], 'deduceRelation的entity只应当出现在一对多的路径上');
                    assert(!changeRoot, 'cascadeUpdate不应产生两条父级路径');
                    assert(!relativeRootPath, 'cascadeUpdate不应产生两条父级路径');
                    changeRoot = true;
                    // 基于普通外键的many-to-one
                    const operationMto = data[attr];
                    const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                    let parentFilter2: ED[keyof ED]['Selection']['filter'] = undefined;
                    if (actionMto === 'create') {
                    }
                    else if (action === 'create') {
                        const { [`${attr}Id`]: fkId } = data;
                        assert(typeof fkId === 'string');
                        if (filterMto?.id) {
                            assert(filterMto.id === fkId);
                        }
                        else {
                            parentFilter2 = {
                                id: fkId,
                            };
                        }
                    }
                    else {
                        // 剩下三种情况都是B中的filter的id来自A中row的外键
                        assert(!data.hasOwnProperty(`${attr}Id`));
                        if (filterMto?.id) {
                            // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                            assert(typeof filterMto.id === 'string');
                        }
                        else if (filter![`${attr}Id`]) {
                            parentFilter2 = {
                                id: filter![`${attr}Id`],
                            };
                        }
                        else if (filter![attr]) {
                            parentFilter2 = filter![attr];
                        }
                        else {
                            parentFilter2 = {
                                id: {
                                    $in: {
                                        entity,
                                        data: {
                                            [`${attr}Id`]: 1,
                                        },
                                        filter,
                                    },
                                },
                            };
                        }
                    }

                    appendChildPath(attr);
                    children.push({
                        entity,
                        action,
                        relativePath: attr,
                    });
                    root = destructFn(rel, operationMto, '', parentFilter2);
                }
                else if (rel instanceof Array) {
                    const [entityOtm, foreignKey] = rel;
                    // 如果是一对多的deduceRelation，可以忽略，其父对象能过就行
                    if (!this.authDeduceRelationMap[entityOtm]) {
                        const otmOperations = data[attr];
                        if (entityOtm === 'userRelation' && entity !== 'user') {
                            assert(!relativeRootPath, 'userRelation只能创建在最顶层');
                            const dealWithUserRelation = (userRelation: ED['userRelation']['CreateSingle']) => {
                                const { action, data } = userRelation;
                                assert(action === 'create', 'cascade更新中只允许创建userRelation');
                                const attrs = Object.keys(data);
                                assert(difference(attrs, Object.keys(this.schema.userRelation.attributes).concat('id')).length === 0);
                                userRelations.push(data as ED['userRelation']['OpSchema']);
                            };
                            if (otmOperations instanceof Array) {
                                otmOperations.forEach(
                                    (otmOperation) => dealWithUserRelation(otmOperation)
                                );
                            }
                            else {
                                dealWithUserRelation(otmOperations);
                            }
                        }
                        else {
                            const subPath = foreignKey ? foreignKey.slice(0, foreignKey.length - 2) : entity as string;
                            const relativeRootPath2 = relativeRootPath ? `${subPath}.${relativeRootPath}` : subPath;
                            const dealWithOneToMany = (otm: ED[keyof ED]['Update'] | ED[keyof ED]['Create']) => {
                                // 一对多之后不允许再有多对一的关系（cascadeUpdate更新必须是一棵树，不允许森林）
                                destructFn(entityOtm, otm, relativeRootPath2,);
                            };
                            if (otmOperations instanceof Array) {
                                const actionDict: Record<string, 1> = {};
                                otmOperations.forEach(
                                    (otmOperation) => {
                                        const { action } = otmOperation;
                                        if (!actionDict[action]) {
                                            actionDict[action] = 1;
                                        }
                                        dealWithOneToMany(otmOperation);
                                    }
                                );
                                Object.keys(actionDict).forEach(
                                    action => children.push({
                                        entity: entityOtm,
                                        action,
                                        relativePath: relativeRootPath2,
                                    })
                                );
                            }
                            else {
                                const { action: actionOtm } = otmOperations;
                                dealWithOneToMany(otmOperations);
                                children.push({
                                    entity: entityOtm,
                                    action: actionOtm,
                                    relativePath: relativeRootPath2,
                                });
                            }
                        }
                    }
                }
            }
            return root;
        };

        const root = destructFn(entity, operation, '');
        return {
            root,
            children,
            userRelations,
        };
    }

    // 前台检查filter是否满足relation约束
    checkRelationSync<T extends keyof ED, Cxt extends SyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt) {
        if (context.isRoot()) {
            return;
        }
        const action = (operation as ED[T]['Operation']).action || 'select';

        if (action === 'select' && this.selectFreeEntities.includes(entity)) {
            return;
        }

        this.checkActions(entity, operation, context);
    }

    private getDeducedCheckOperation<T extends keyof ED, Cxt extends AsyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection']
    ): {
        entity: keyof ED;
        operation: ED[keyof ED]['Operation'] | ED[keyof ED]['Selection'];
        actions?: ED[keyof ED]['Action'][];
    } | undefined {
        // 如果是deduce的对象，将之转化为所deduce的对象上的权限检查            
        const deduceAttr = this.authDeduceRelationMap[entity]!;
        assert(deduceAttr === 'entity', `当前只支持entity作为deduce外键，entity是「${entity as string}」`);
        const { data, filter } = operation;
        const action = (<ED[T]['Operation']>operation).action || 'select';
        if (action === 'create') {
            let deduceEntity = '', deduceEntityId = '';
            if (filter) {
                // 有filter优先判断filter
                deduceEntity = filter.entity;
                deduceEntityId = filter.entityId;
                // assert(deduceEntity, `${entity as string}对象上的${action}行为，filter中必须带上${deduceAttr as string}的外键条件`);
                // assert(deduceEntityId, `${entity as string}对象上的${action}行为，filter中必须带上${deduceAttr as string}Id的外键条件`);
            }
            else if (data instanceof Array) {
                for (const d of data) {
                    if (!deduceEntity) {
                        deduceEntity = d.entity;
                        assert(deduceEntity);
                        deduceEntityId = d.entityId;
                        assert(deduceEntityId);
                    }
                    else {
                        // 前端应该不会有这种意外发生
                        assert(d.entity === deduceEntity, `同一批create只能指向同一个对象`);
                        assert(d.entityId === deduceEntityId, '同一批create应指向同一个外键');
                    }
                }
            }
            else {
                deduceEntity = (data as ED[T]['CreateSingle']['data']).entity;
                deduceEntityId = (data as ED[T]['CreateSingle']['data']).entityId;
                // assert(deduceEntity);
                // assert(deduceEntityId);
            }

            if (deduceEntity && deduceEntityId) {
                const excludeActions = readOnlyActions.concat(['create', 'remove']);
                const updateActions = this.schema[deduceEntity].actions.filter(
                    (a) => !excludeActions.includes(a)
                );

                return {
                    entity: deduceEntity,
                    operation: {
                        action: 'update',
                        data: {},
                        filter: {
                            id: deduceEntityId,
                        },
                    },
                    actions: updateActions,
                };
            }
        }
        else {
            // 目前应该都有这两个属性，包括select
            let { entity: deduceEntity, entityId: deduceEntityId } = filter!;
            // assert(deduceEntity, `${entity as string}对象上的${action}行为，必须带上${deduceAttr as string}的外键条件`);
            // assert(deduceEntityId, `${entity as string}对象上的${action}行为，必须带上${deduceAttr as string}Id的外键条件`);
            let deduceFilter: ED[keyof ED]['Selection']['filter'] = {};
            if (deduceEntity && deduceEntityId) {
                deduceFilter = { id: deduceEntityId };
            }
            else {
                // 也可能是用cascade方式进行查找，这里有时候filter上会带有两个不同的entity目标，尚未处理（todo!）
                const { ref } = this.schema[entity].attributes.entity;
                assert (ref instanceof Array);
                for (const refEntity of ref) {
                    if (filter![refEntity]) {
                        deduceEntity = refEntity;
                        deduceFilter = filter![refEntity];
                        break;
                    }
                }
            }
            
            if (deduceEntity && deduceFilter) {
                if (action === 'select') {
                    return {
                        entity: deduceEntity,
                        operation: {
                            action: 'select',
                            data: { id: 1 },
                            filter: deduceFilter,
                        }
                    };
                }
                else {
                    // 目前对于非select和create的action，只要有其父对象的某一update/remove属性即可以（这样设计可能不严谨）
                    const excludeActions = readOnlyActions.concat(['create']);
                    const updateActions = this.schema[deduceEntity].actions.filter(
                        (a) => !excludeActions.includes(a)
                    );

                    return {
                        entity: deduceEntity,
                        operation: {
                            action: 'update',
                            data: {},
                            filter: deduceFilter,
                        },
                        actions: updateActions,
                    };
                }
            }
        }
    }

    /**
     * 查询当前用户在对应entity上可以操作的relationIds
     * @param entity 
     * @param entityId 
     * @param context 
     * @returns 
     */
    private getGrantedRelationIds<Cxt extends AsyncContext<ED> | SyncContext<ED>>(entity: keyof ED, entityId: string, context: Cxt) {
        const result = context.select('relationAuth', {
            data: {
                id: 1,
                destRelationId: 1,
                destRelation: {
                    id: 1,
                    name: 1,
                    entity: 1,
                    entityId: 1,
                    display: 1,
                },
            },
            filter: {
                sourceRelationId: {
                    $in: {
                        entity: 'userRelation',
                        data: {
                            relationId: 1,
                        },
                        filter: {
                            userId: context.getCurrentUserId(),
                        },
                    }
                },
                destRelation: {
                    entity: entity as string,
                    $or: [
                        {
                            entityId,
                        },
                        {
                            entityId: {
                                $exists: false,
                            },
                        }
                    ],
                },
            },
        }, {});
        if (result instanceof Promise) {
            return result.then(
                (r2) => r2.map(ele => ele.destRelation!)
            );
        }
        return result.map(ele => ele.destRelation!);
    }

    private checkSpecialEntity<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'],
        context: Cxt,
    ): string | Promise<string> {
        const action = (operation as ED[T]['Operation']).action || 'select';
        switch (action) {
            case 'select': {
                if (['relation', 'actionAuth', 'relationAuth', 'user', 'userEntityGrant', 'oper', 'operEntity'].includes(entity as string)) {
                    return '';
                }
                if (entity === 'userRelation') {
                    const { filter } = operation as ED[T]['Selection'];
                    if (filter?.userId === context.getCurrentUserId()) {
                        return '';
                    }
                    else {
                        // 查询某一对象的relation，意味着该用户有权利管辖该对象上至少某一种relation的操作权限
                        const userId = context.getCurrentUserId();
                        operation.filter = addFilterSegment({
                            relationId: {
                                $in: {
                                    entity: 'relationAuth',
                                    data: {
                                        destRelationId: 1,
                                    },
                                    filter: {
                                        sourceRelationId: {
                                            $in: {
                                                entity: 'userRelation',
                                                data: {
                                                    relationId: 1,
                                                },
                                                filter: {
                                                    userId,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        }, operation.filter);
                        return '';
                    }
                }
                break;
            }
            default: {
                switch (entity) {
                    case 'userRelation': {
                        const { filter, data, action } = operation as ED[T]['Operation'];
                        assert(!(data instanceof Array));
                        assert(['create', 'remove'].includes(action));
                        if (action === 'create') {
                            assert(!(data instanceof Array));
                            const { entity, entityId, relationId } = data as ED['userRelation']['CreateSingle']['data'];
                            const destRelations = this.getGrantedRelationIds(entity!, entityId!, context);
                            if (destRelations instanceof Promise) {
                                return destRelations.then(
                                    (r2) => {
                                        if (!r2.find(ele => ele.id === relationId)) {
                                            return `当前用户没有为id为「${entityId}」的「${entity}」对象创建「${relationId}」人员关系的权限`;
                                        }
                                        return '';
                                    }
                                );
                            }
                            if (!destRelations.find(ele => ele.id === relationId)) {
                                return `当前用户没有为id为「${entityId}」的「${entity}」对象创建「${relationId}」人员关系的权限`;
                            }
                        }
                        else {
                            // remove加上限制条件
                            const userId = context.getCurrentUserId();
                            assert(filter);
                            operation.filter = addFilterSegment({
                                relationId: {
                                    $in: {
                                        entity: 'relationAuth',
                                        data: {
                                            destRelationId: 1,
                                        },
                                        filter: {
                                            sourceRelationId: {
                                                $in: {
                                                    entity: 'userRelation',
                                                    data: {
                                                        relationId: 1,
                                                    },
                                                    filter: {
                                                        userId,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            }, filter);
                        }
                        return '';
                    }
                    case 'user': {
                        // 对用户的操作由应用自己去管理权限，这里只检查grant/revoke
                        const { data } = operation as ED['user']['Update'];
                        if (data.hasOwnProperty('userRelation$user')) {
                            const { userRelation$user } = data;
                            const checkUrOperation = (urOperation: ED['userRelation']['Operation']) => this.checkSpecialEntity('userRelation', urOperation, context);
                            if (userRelation$user instanceof Array) {
                                const result = userRelation$user.map(ur => checkUrOperation(ur));
                                if (result[0] instanceof Promise) {
                                    return Promise.all(result).then(
                                        (r2) => r2.join('')
                                    );
                                }
                                return result.join('');
                            }
                            return checkUrOperation(userRelation$user!);
                        }
                        return '';
                    }
                    case 'userEntityGrant': {
                        // 对userEntityGrant进行操作，权限上等价于对此权限进行授权操作
                        const { filter, data, action } = operation as ED[T]['Operation'];
                        assert(!(data instanceof Array));
                        assert(['create', 'remove'].includes(action));
                        if (action === 'create') {
                            assert(!(data instanceof Array));
                            const { entity, entityId, relationId } = data as ED['userEntityGrant']['CreateSingle']['data'];
                            const destRelations = this.getGrantedRelationIds(entity!, entityId!, context);
                            if (destRelations instanceof Promise) {
                                return destRelations.then(
                                    (r2) => {
                                        if (!r2.find(ele => ele.id === relationId)) {
                                            return `当前用户没有为id为「${entityId}」的「${entity}」对象创建「${relationId}」上授权的权限`;
                                        }
                                        return '';
                                    }
                                );
                            }
                            if (!destRelations.find(ele => ele.id === relationId)) {
                                return `当前用户没有为id为「${entityId}」的「${entity}」对象创建「${relationId}」人员关系的权限`;
                            }
                        }
                        else {
                            // remove加上限制条件
                            const userId = context.getCurrentUserId();
                            assert(filter);
                            operation.filter = addFilterSegment({
                                relationId: {
                                    $in: {
                                        entity: 'relationAuth',
                                        data: {
                                            destRelationId: 1,
                                        },
                                        filter: {
                                            sourceRelationId: {
                                                $in: {
                                                    entity: 'userRelation',
                                                    data: {
                                                        relationId: 1,
                                                    },
                                                    filter: {
                                                        userId,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            }, filter);
                        }
                        return '';
                    }
                    default: {
                        break;
                    }
                }
                break;
            }
        }
        assert(false, `${entity as string}的${action}权限还未详化处理`);
    }

    private tryCheckDeducedAuth<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'],
        context: Cxt,
        actions?: ED[T]['Action'][],
    ): string | Promise<string> {
        if (this.authDeduceRelationMap[entity]) {
            const deducedResult = this.getDeducedCheckOperation(entity, operation);
            if (deducedResult) {
                const { entity: deduceEntity, operation: deduceOperation, actions: deduceActions } = deducedResult;
                assert(!this.authDeduceRelationMap[deduceEntity], '目前不应出现连续的deduceRelationAuth');
                return this.tryCheckSelfAuth(deduceEntity, deduceOperation, context, deduceActions);
            }
            return `${entity as string}上虽然有deduce权限但不存在相应的查询路径`;
        }
        return `${entity as string}上不存在有效的deduce权限`;
    }

    private tryCheckSelfAuth<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'],
        context: Cxt,
        actions?: ED[T]['Action'][],
    ): string | Promise<string> {
        const action = (operation as ED[T]['Operation']).action || 'select';
        const userId = context.getCurrentUserId()!;

        if (action === 'select') {
            // select的权限检查发生在每次cascadeSelect时，如果有多对一的join，被join的实体不需要检查
            if (['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity', 'userRelation', 'actionAuth',
                'freeActionAuth', 'relationAuth', 'userEntityGrant', 'relation'].includes(entity as string)) {
                return this.checkSpecialEntity(entity, operation, context);
            }
            if (!this.relationalChecker[entity]) {
                throw new OakUserUnpermittedException(`处理${entity as string}上不存在有效的actionPath`);
            }
            const checker = this.relationalChecker[entity]!(userId, actions || ['select'], undefined, operation.filter!);
            if (typeof checker === 'string') {
                return checker;
            }
            const result = checker(context, true);
            if (result instanceof Promise) {
                return result.then(
                    (r2) => {
                        if (r2.length === 0) {
                            return `对「${entity as string}」进行「${action}」操作时找不到对应的授权`;
                        }
                        return '';
                    }
                )
            }
            if (result.length === 0) {
                return `对「${entity as string}」进行「${action}」操作时找不到对应的授权`;
            }
        }
        else {
            // operate的权限检查只发生一次，需要在这次检查中将所有cascade的对象的权限检查完成
            // 算法是先将整个update的根结点对象找到，并找到为其赋权的relation，再用此relation去查找所有子对象上的actionAuth
            const result = [] as Array<Promise<string>>;
            const { root, children, userRelations } = this.destructCascadeOperation(entity, operation as ED[T]['Operation']);

            const { entity: e, data: d, filter: f, action: a } = root;
            if (userRelations.length > 0) {
                assert(e !== 'user');
                assert(a === 'create' && !(d instanceof Array));
                const createIds = userRelations.map(ele => ele.relationId!);
                // 这里处理的是创建对象时顺带创建相关权限，要检查该权限是不是有create动作授权
                const aas = context.select('actionAuth', {
                    data: {
                        id: 1,
                        relationId: 1,
                    },
                    filter: {
                        destEntity: e as string,
                        deActions: {
                            $contains: 'create',
                        },
                        path: '',
                    },
                }, { dontCollect: true });
                if (aas instanceof Promise) {
                    result.push(
                        aas.then(
                            (aas2) => {
                                const relationIds = aas2.map(ele => ele.relationId);
                                const diff = difference(createIds, relationIds);
                                if (diff.length > 0) {
                                    return `您无权创建「${e as string}」对象上id为「${diff.join(',')}」的用户权限`;
                                }
                                return '';
                            }
                        )
                    );
                }
                else {
                    const relationIds = aas.map(ele => ele.relationId!);
                    const diff = difference(createIds, relationIds);
                    if (diff.length > 0) {
                        return `您无权创建「${e as string}」对象上id为「${diff.join(',')}」的用户权限`;
                    }
                }
            }
            if (['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity', 'userRelation', 'actionAuth',
                'freeActionAuth', 'relationAuth', 'userEntityGrant', 'relation'].includes(e as string)) {
                // 只要根对象能检查通过就算通过（暂定这个策略）                
                const r = this.checkSpecialEntity(e, {
                    action: a,
                    data: d,
                    filter: f,
                }, context);
                if (r instanceof Promise) {
                    result.push(r);
                }
            }
            else {
                if (!this.relationalChecker[e]) {
                    throw new OakUserUnpermittedException(`${root.entity as string}上不存在有效的actionPath`);
                }
                const checker = this.relationalChecker[root.entity]!(userId, actions || [root.action], root.data, root.filter, userRelations);
                if (typeof checker === 'string') {
                    return checker;
                }
                const r = checker(context, children.length === 0);
                const checkChildrenAuth = (relativePath: string, relationId?: string) => {
                    const filters = children.map(
                        ({ entity, action, relativePath: childPath }) => {
                            const path = relativePath ? `${childPath}.${relativePath}` : childPath;
                            return {
                                path,
                                destEntity: entity as string,
                                deActions: {
                                    $contains: action,
                                }
                            };
                        }
                    );
                    if (relationId) {
                        // 有relationId，说明是userRelation赋权，查找actionAuth中有无相应的行
                        // 为了节省性能，合并成一个or查询
                        const r2 = context.select('actionAuth', {
                            data: {
                                id: 1,
                                path: 1,
                                destEntity: 1,
                                deActions: 1,
                            },
                            filter: {
                                $or: filters,
                                relationId,
                            }
                        }, { dontCollect: true });

                        const checkActionAuth = (actionAuths: Partial<ED['actionAuth']['OpSchema']>[]) => {
                            const missedChild = children.find(
                                ({ entity, action, relativePath: childPath }) => {
                                    const path = relativePath ? `${childPath}.${relativePath}` : childPath;
                                    return !actionAuths.find(
                                        (ele) => ele.path === path && ele.deActions?.includes(action) && ele.destEntity === entity
                                    );
                                }
                            );
                            if (missedChild) {
                                return `对「${missedChild.entity as string}」进行「${missedChild.action}」操作时找不到对应的授权`;
                            }
                            return '';
                        };
                        if (r2 instanceof Promise) {
                            return r2.then(
                                (r3) => checkActionAuth(r3)
                            );
                        }
                        return checkActionAuth(r2);
                    }
                    else {
                        // 取消directActionAuth，发现root对象能过，则子对象全部自动通过
                        return '';
                    }
                };
                if (r instanceof Promise) {
                    result.push(
                        r.then(
                            (r2) => Promise.all(r2.map(
                                ({ relativePath, relationId }) => checkChildrenAuth(relativePath, relationId)
                            ))).then(
                                (r3) => {
                                    if (r3.length === 0) {
                                        return `对「${entity as string}」进行「${action}」操作时找不到对应的授权`;
                                    }
                                    if (r3.indexOf('') >= 0) {
                                        // 有一个过就证明能过
                                        return '';
                                    }
                                    return r3.find(
                                        ele => !!ele
                                    )!;
                                }
                            )
                    );
                }
                else {
                    const r3 = r.map(
                        ({ relativePath, relationId }) => checkChildrenAuth(relativePath, relationId)
                    );

                    if (r3.length > 0 && r3.includes('')) {
                        // 有一个过就证明能过
                        return '';
                    }
                    return r3.find(
                        ele => !!ele
                    ) || `对「${entity as string}」进行「${action}」操作时找不到对应的授权`;
                }
            }
            if (result.length > 0) {
                return Promise.all(result).then(
                    (r2) => {
                        const r3 = r2.find(
                            ele => !!ele
                        );
                        if (r3) {
                            return r3;
                        }
                        return '';
                    }
                );
            }
        }
        return '';
    }

    private checkActions<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'],
        context: Cxt,
        actions?: ED[T]['Action'][],
    ): void | Promise<void> {
        // 现在checkDeducedAuth和checkSelfAuth是一个或的关系，两者能过一个就算过（message对象就两种可能都有）
        const result = this.tryCheckDeducedAuth(entity, operation, context, actions);
        if (result instanceof Promise) {
            return result.then(
                (rt) => {
                    if (!rt) {
                        return;
                    }
                    const result2 = this.tryCheckSelfAuth(entity, operation, context, actions);
                    if (result2 instanceof Promise) {
                        return result2.then(
                            (rt2) => {
                                if (!rt2) {
                                    return;
                                }
                                throw new OakUserUnpermittedException(rt2);
                            }
                        );
                    }
                    if (!result2) {
                        return;
                    }
                    throw new OakUserUnpermittedException(result2);
                }
            );
        }
        if (!result) {
            return;
        }
        const result2 = this.tryCheckSelfAuth(entity, operation, context, actions);
        if (result2 instanceof Promise) {
            return result2.then(
                (rt2) => {
                    if (!rt2) {
                        return;
                    }
                    throw new OakUserUnpermittedException(rt2);
                }
            );
        }
        if (!result2) {
            return;
        }
        throw new OakUserUnpermittedException(result2);
    }


    // 后台检查filter是否满足relation约束
    async checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt) {
        if (context.isRoot()) {
            return;
        }
        const action = (operation as ED[T]['Operation']).action || 'select';

        if (action === 'select' && this.selectFreeEntities.includes(entity)) {
            return;
        }

        await this.checkActions(entity, operation, context);
    }
}
