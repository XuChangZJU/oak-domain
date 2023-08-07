import assert from "assert";
import { EntityDict } from "../base-app-domain";
import { OakException, OakUniqueViolationException, OakUnloggedInException, OakUserUnpermittedException, StorageSchema } from "../types";
import { AuthCascadePath, EntityDict as BaseEntityDict, AuthDeduceRelationMap } from "../types/Entity";
import { AsyncContext } from "./AsyncRowStore";
import { addFilterSegment, checkFilterContains, combineFilters } from "./filter";
import { judgeRelation } from "./relation";
import { SyncContext } from "./SyncRowStore";
import { readOnlyActions } from '../actions/action';
import { difference, intersection, set, uniq, cloneDeep, groupBy } from '../utils/lodash';
import { SYSTEM_RESERVE_ENTITIES } from "../compiler/env";


type OperationTree<ED extends EntityDict & BaseEntityDict> = {
    entity: keyof ED;
    action: ED[keyof ED]['Action'];
    filter: ED[keyof ED]['Selection']['filter'];
    children: Record<string, OperationTree<ED> | OperationTree<ED>[]>;
    userRelations?: ED['userRelation']['OpSchema'][];
};

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
    static SPECIAL_ENTITIES = SYSTEM_RESERVE_ENTITIES;

    private selectFreeEntities: (keyof ED)[];


    constructor(schema: StorageSchema<ED>,
        actionCascadePathGraph: AuthCascadePath<ED>[],
        relationCascadePathGraph: AuthCascadePath<ED>[],
        authDeduceRelationMap: AuthDeduceRelationMap<ED>,
        selectFreeEntities: (keyof ED)[]) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities;
        this.authDeduceRelationMap = Object.assign({}, authDeduceRelationMap, {
            modi: 'entity',
        });
    }


    // 前台检查filter是否满足relation约束
    checkRelationSync<T extends keyof ED, Cxt extends SyncContext<ED>>(
        entity: T,
        operation: Omit<ED[T]['Operation'] | ED[T]['Selection'], 'id'>,
        context: Cxt
    ) {
        if (context.isRoot()) {
            return;
        }

        this.checkActions2(entity, operation, context);
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
                sourceRelation: {
                    userRelation$relation: {
                        userId: context.getCurrentUserId(),
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


    // 后台检查filter是否满足relation约束
    async checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: Omit<ED[T]['Operation'] | ED[T]['Selection'], 'id'>, context: Cxt) {
        if (context.isRoot()) {
            return;
        }

        await this.checkActions2(entity, operation, context);
    }

    private checkOperateSpecialEntities2<Cxt extends AsyncContext<ED> | SyncContext<ED>>(entity2: keyof ED, action: ED[keyof ED]['Action'], filter: ED[keyof ED]['Selection']['filter'], context: Cxt): boolean | Promise<boolean> {
        switch (entity2) {
            case 'userRelation': {
                assert(!(filter instanceof Array));
                assert(['create', 'remove'].includes(action));
                if (action === 'create') {
                    assert(!(filter instanceof Array));
                    const { entity, entityId, relationId } = filter as ED['userRelation']['CreateSingle']['data'];

                    const destRelations = this.getGrantedRelationIds(entity!, entityId!, context);
                    if (destRelations instanceof Promise) {
                        return destRelations.then(
                            (r2) => {
                                if (!r2.find(ele => ele.id === relationId)) {
                                    return false;
                                }
                                return true;
                            }
                        );
                    }
                    // 若指定了要create的relation，则必须有该relationId存在，否则只要有任意可授权的relation即可
                    if (relationId && !destRelations.find(ele => ele.id === relationId) || destRelations.length === 0) {
                        return false;
                    }
                    return true;
                }
                else {
                    assert(action === 'remove');
                    const userId = context.getCurrentUserId();
                    assert(filter);
                    const contained: ED['userRelation']['Selection']['filter'] = {
                        relation: {
                            relationAuth$destRelation: {
                                sourceRelation: {
                                    userRelation$relation: {
                                        userId,
                                    },
                                },
                            },
                        },
                    };
                    return checkFilterContains(entity2, context, contained, filter, true);
                }
            }
            case 'user': {
                // 对用户的操作由应用自己去管理权限，这里只检查grant/revoke
                if (['grant', 'revoke'].includes(action)) {
                    // assert(filter && Object.keys(filter).length === 1, 'grant/revoke只能操作userRelation$user');
                    // assert(filter!.hasOwnProperty('userRelation$user'), 'grant/revoke只能操作userRelation$user');
                    return true;
                }
                else {
                    // 应用允许用户操作其它用户的逻辑请通过编写类型为relation的checker去控制，在这里不能加以限制
                    return true;
                }
            }
            case 'modi': {
                // modi的操作权限都是由触发器触发，不用再检测了
                return true;
            }
            case 'relation': {
                // 创建relation目前不支持，以后再说
                return false;
            }
            case 'userEntityGrant': {
                // userEntityGrant的创建相当于授权，领取相当于赋权
                if (['create', 'update', 'remove'].includes(action)) {
                    if (action === 'create') {
                        return this.checkOperateSpecialEntities2('userRelation', 'create', filter, context);
                    }
                    return this.checkOperateSpecialEntities2('userRelation', 'action', {
                        relation: {
                            userEntityGrant$relation: filter,
                        },
                    }, context);
                }
                // 领取和读取动作公开
                return true;
            }
            default: {
                assert(false, `对象${entity2 as string}的权限控制没有加以控制`);
            }
        }
    }


    private getDeducedEntityFilters<T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
        entity: T,
        filter: ED[T]['Selection']['filter'],
        actions: ED[T]['Action'][],
        context: Cxt
    ): Array<{
        entity: keyof ED;
        filter: ED[keyof ED]['Selection']['filter'];
        actions: ED[T]['Action'][];
    }> | Promise<Array<{
        entity: keyof ED;
        filter: ED[keyof ED]['Selection']['filter'];
        actions: ED[T]['Action'][];
    }>> {
        const entityFilters: Array<{
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
            actions: ED[T]['Action'][];
        }> = [
                {
                    entity,
                    filter,
                    actions,
                }
            ];

        if (this.authDeduceRelationMap[entity]) {
            assert(this.authDeduceRelationMap[entity] === 'entity');
            let { entity: deduceEntity, entityId: deduceEntityId } = filter!;

            let deduceFilter: ED[keyof ED]['Selection']['filter'] = {};
            if (deduceEntity && deduceEntityId) {
                deduceFilter = { id: deduceEntityId };
            }
            else {
                // 也可能是用cascade方式进行查找，这里有时候filter上会带有两个不同的entity目标，尚未处理（todo!）
                const { ref } = this.schema[entity].attributes.entity;
                assert(ref instanceof Array);
                for (const refEntity of ref) {
                    if (filter![refEntity]) {
                        deduceEntity = refEntity;
                        deduceFilter = filter![refEntity];
                        break;
                    }
                }
            }

            const getRecursiveDeducedFilters = (deduceEntity: keyof ED, deduceFilter: ED[keyof ED]['Selection']['filter']) => {
                const excludeActions = readOnlyActions.concat([/* 'create', 'remove' */]);
                const updateActions = this.schema[deduceEntity].actions.filter(
                    (a) => !excludeActions.includes(a)
                );
                if (!RelationAuth.SPECIAL_ENTITIES.includes(deduceEntity as string)) {
                    return this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions, context);
                }
                return [];
            };

            if (deduceEntity && deduceFilter) {
                const deducedSelections = getRecursiveDeducedFilters(deduceEntity, deduceFilter);
                if (deducedSelections instanceof Promise) {
                    return deducedSelections.then(
                        (ds) => {
                            entityFilters.push(...ds);
                            return entityFilters;
                        }
                    );
                }
                entityFilters.push(...deducedSelections);
                return entityFilters;
            }
            else {
                /**
                 * 这种情况说明从filter中无法确定相应的deduceFilter，需要查找该实体对应的entity/entityId来进行推导。
                 * 这种情况一般发生在entity1 -> entity2上，此时entity2应该是一个固定id查询的filter
                 * 在这里先假设如果碰到了list类型的filter，直接不使用deduce路径上的对象来推导
                 */
                const rows2 = context.select(entity, {
                    data: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    filter,
                    indexFrom: 0,
                    count: 10,
                }, { dontCollect: true, blockTrigger: true });

                const dealWithData = (rows: Partial<ED[keyof ED]['OpSchema']>[]) => {
                    // 这里如果entity指向不同的实体，一般出现这样的查询，则其权限应当不由这条deduce路径处理
                    // 同上，如果找到的行数大于1行，说明deduce路径上的对象不确定，也暂不处理  by Xc 20230725
                    if (rows.length > 1 || rows.length === 0) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn(`进行deduce推导时找到了${rows.length}行${entity as string}数据`);
                        }
                        return entityFilters;
                    }
                    const { entity: deducedEntity, entityId: deducedEntityId } = rows[0];
                    if (!deducedEntity || !deducedEntityId) {
                        // 这种情况会出现在前台缓存里
                        return entityFilters;
                    }
                    const result = getRecursiveDeducedFilters(deducedEntity, {
                        id: deduceEntityId,
                    });

                    if (result instanceof Promise) {
                        return result.then(
                            (r2) => {
                                entityFilters.push(...r2);
                                return entityFilters;
                            }
                        );
                    }

                    entityFilters.push(...result);
                    return entityFilters;
                };

                if (rows2 instanceof Promise) {
                    return rows2.then(
                        (r2) => dealWithData(r2)
                    );
                }
                return dealWithData(rows2);
            }
        }
        return entityFilters;
    }

    /**
     * 对于selection，解构出最底层的对象，如果最底层的对象可以被访问，则父对象一定可以
     * 但对于deduce的子对象，不必再向底层查看（假设deduce对象一般都位于树的最底层附近）
     * @param entity 
     * @param operation 
     */
    private destructSelection<T extends keyof ED>(entity: T, selection: Omit<ED[T]['Selection'], 'id'>) {
        const leafSelections: Array<{
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
        }> = [];

        const destructInner = <T2 extends keyof ED>(entity2: T2, selection2: Omit<ED[T2]['Selection'], 'id'>) => {
            const { data, filter } = selection2;

            let hasOneToMany = false;
            for (const attr in data) {
                const rel = judgeRelation(this.schema, entity2, attr);
                if (rel instanceof Array) {
                    const [e, foreignKey] = rel;
                    if (foreignKey) {
                        assert(!this.authDeduceRelationMap[e]);
                        hasOneToMany = true;
                        destructInner(e, {
                            data: data[attr].data,
                            filter: combineFilters([{
                                [foreignKey.slice(0, foreignKey.length - 2)]: filter,
                            }, data[attr].filter || {}]),
                        } as any);
                    }
                    else {
                        if (!this.authDeduceRelationMap[e]) {
                            hasOneToMany = true;
                            destructInner(e, {
                                data: data[attr].data,
                                filter: combineFilters([{
                                    [entity2]: filter,
                                }, data[attr].filter || {}]),
                            } as any);
                        }
                        else {
                            assert(this.authDeduceRelationMap[e] === 'entity');
                        }
                    }
                }
            }

            if (!hasOneToMany) {
                leafSelections.push({
                    entity: entity2,
                    filter,
                });
            }
        };

        destructInner(entity, cloneDeep(selection));
        return leafSelections;
    }

    /**
     * 对于operation，解构出一个树形结构，以方便自顶向下的进行访问
     * 但对于deduce的子对象，不必再向底层查看
     * @param entity 
     * @param selection 
     */
    private destructOperation<T extends keyof ED>(entity2: T, operation2: Omit<ED[T]['Operation'], 'id'>, userId: string) {
        /**
         * 对create动作，把data中的cascade部分剔除后作为filter参与后续的检验
         * @param operation 
         * @returns 
         */
        const makeCreateFilter = <T2 extends keyof ED>(entity: T2, operation: Omit<ED[T2]['CreateSingle'], 'id'>) => {
            const { data, filter } = operation;
            assert(!(data instanceof Array));
            if (data) {
                const data2: ED[T2]['Selection']['filter'] = {};
                for (const attr in data) {
                    const rel = judgeRelation(this.schema, entity, attr);
                    if (rel === 1) {
                        // 只需要记住id和各种外键属性，不这样处理有些古怪的属性比如coordinate，其作为createdata和作为filter并不同构
                        if ((['id', 'entity', 'entityId'].includes(attr) || this.schema[entity].attributes[attr as any]?.type === 'ref') && typeof data[attr] === 'string') {
                            data2[attr] = data[attr];
                        }
                    }
                }
                return data2;
            }
            return filter;
        };

        const addChild = (node: OperationTree<ED>, path: string, child: OperationTree<ED>) => {
            // 在这里要把可以被node deduce出来的child处理掉
            const paths = path.split('$');
            assert(paths.length >= 2);
            if (this.authDeduceRelationMap[child.entity] === paths[1]) {
                assert(paths[1] === 'entity', '当前只支持entity外键上的deduce');
                return false;
            }

            if (node.children[path]) {
                if (node.children[path] instanceof Array) {
                    (node.children[path] as OperationTree<ED>[]).push(child);
                }
                else {
                    node.children[path] = [node.children[path] as OperationTree<ED>, child];
                }
            }
            else {
                Object.assign(node.children, {
                    [path]: child,
                });
            }
            return true;
        };

        const destructInner = <T2 extends keyof ED>(entity: T2, operation: Omit<ED[T2]['Operation'], 'id'>, path?: string, child?: OperationTree<ED>, hasParent?: true): OperationTree<ED> => {
            const { action, data, filter } = operation;
            const filter2 = action === 'create' ? makeCreateFilter(entity, operation as Omit<ED[T]['CreateSingle'], 'id'>) : filter;
            assert(filter2);

            const me: OperationTree<ED> = {
                entity: entity,
                filter: filter2,
                children: {},
                action,
            };
            let root = me;

            // 如果当前对象是一个toModi的，意味着它的cascadeUpdate会全部被变为modi去缓存，因此不需要再向下检查了
            // modi被apply时，这些modi产生的更新才会被实际检查
            const isModiUpdate = this.schema[entity].toModi && action !== 'remove';

            if (child) {
                assert(path);
                addChild(me, path, child);
            }

            for (const attr in data) {
                const rel = judgeRelation(this.schema, entity, attr);
                if (rel === 2 && !isModiUpdate) {
                    assert(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(attr, data[attr] as any, `${entity as string}$entity`, me);
                }
                else if (typeof rel === 'string' && !isModiUpdate) {
                    assert(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(rel, data[attr] as any, `${entity as string}$${attr}`, me);
                }
                else if (rel instanceof Array && !isModiUpdate) {
                    const [e, f] = rel;
                    const otmOperations = data[attr];
                    if (e === 'userRelation' && entity !== 'user') {
                        me.userRelations = [];
                        const dealWithUserRelation = (userRelation: ED['userRelation']['CreateSingle']) => {
                            const { action, data } = userRelation;
                            assert(action === 'create', 'cascade更新中只允许创建userRelation');
                            const attrs = Object.keys(data);
                            assert(difference(attrs, Object.keys(this.schema.userRelation.attributes).concat('id')).length === 0);
                            if (data.userId === userId) {
                                me.userRelations?.push(data as ED['userRelation']['OpSchema']);
                            }
                        };
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach(
                                (otmOperation) => dealWithUserRelation(otmOperation)
                            );
                        }
                        else {
                            dealWithUserRelation(otmOperations as any);
                        }
                    }
                    else {
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach(
                                (otmOperation) => {
                                    const son = destructInner(e, otmOperation, undefined, undefined, true);
                                    addChild(me, attr, son);
                                }
                            )
                        }
                        else {
                            const son = destructInner(e, otmOperations as any, undefined, undefined, true);
                            addChild(me, attr, son);
                        }
                    }
                }

            }

            return root;
        };

        return destructInner(entity2, cloneDeep(operation2));
    }

    /**
     * 定位到了当前用户所有可能的actionAuth，再用以判定对应的entity是不是满足当前的查询约束
     * @param entity 
     * @param filter 
     * @param actionAuths 
     * @param context 
     * @return  string代表用户获得授权的relationId，空字符串代表通过userId赋权，false代表失败
     */
    private checkSingleOperation<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        filter: ED[T]['Selection']['filter'],
        actionAuths: ED['actionAuth']['Schema'][],
        context: Cxt,
        actions: ED[T]['Action'][],

    ) {
        const legalAuths = actionAuths.filter(
            ele => ele.destEntity === entity && intersection(ele.deActions, actions).length > 0     // 这里只要overlap就可以了
        );

        return legalAuths.map(
            (ele) => {
                const { path, relation, relationId } = ele;
                if (relationId) {
                    assert(relation);
                    const { userRelation$relation: userRelations } = relation;
                    if (userRelations!.length > 0) {
                        const entityIds = uniq(userRelations!.map(ele => ele.entityId));
                        const contained = {};
                        const idFilter = entityIds.length > 1 ? {
                            $in: entityIds,
                        } : entityIds[0];
                        assert(idFilter);
                        if (path) {
                            set(contained, path, {
                                id: idFilter,
                            });
                        }
                        else {
                            Object.assign(contained, {
                                id: idFilter
                            });
                        }
                        const contains = checkFilterContains(entity, context, contained, filter, true)
                        if (contains instanceof Promise) {
                            return contains.then(
                                (c) => {
                                    if (c) {
                                        return ele;
                                    }
                                    return;
                                }
                            )
                        }

                        if (contains) {
                            return ele;
                        }
                        return;
                    }
                    return;
                }
                // 说明是通过userId关联
                const contained = {};
                set(contained, `${path}.id`, context.getCurrentUserId());
                if (checkFilterContains(entity, context, contained, filter, true)) {
                    return ele;
                }
                return;
            }
        );
    }


    private checkSelection<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        selection: Omit<ED[T]['Selection'], 'id'>,
        context: Cxt,
    ) {
        const leafSelections = this.destructSelection(entity, selection);
        const deducedLeafSelections = leafSelections.map(
            ({ entity, filter }) => this.getDeducedEntityFilters(entity, filter, ['select'], context)
        );

        const checkDeducedLeafSelections = (dlSelections2: {
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
            actions: ED[T]['Action'][];
        }[][]) => {
            const dlSelections = dlSelections2.filter(
                (ele) => {
                    const entities = ele.map(ele2 => ele2.entity);
                    // 同一个leaf的deducedSelections中只要有一个能通过就足够了
                    if (intersection(this.selectFreeEntities, entities).length > 0) {
                        return false;
                    }

                    if (intersection(RelationAuth.SPECIAL_ENTITIES, entities).length > 0) {
                        // todo 
                        return false;
                    }
                    return true;
                }
            );
            if (dlSelections.length === 0) {
                return true;
            }

            if (!context.getCurrentUserId()) {
                throw new OakUnloggedInException();
            }

            const allEntities: (keyof ED)[] = [];
            dlSelections.forEach(
                (ele) => ele.forEach(
                    ({ entity }) => {
                        allEntities.push(entity)
                    }
                )
            );

            const actionAuths = context.select('actionAuth', {
                data: {
                    id: 1,
                    path: 1,
                    destEntity: 1,
                    deActions: 1,
                    relation: {
                        id: 1,
                        userRelation$relation: {
                            $entity: 'userRelation',
                            data: {
                                id: 1,
                                entity: 1,
                                entityId: 1,
                            },
                            filter: {
                                userId: context.getCurrentUserId(),
                            },
                        },
                    },
                },
                filter: {
                    deActions: {
                        $contains: 'select',
                    },
                    destEntity: {
                        $in: allEntities as string[],
                    }
                }
            }, { dontCollect: true });

            /**
             * 返回的结果中，第一层为leafNode，必须全通过，第二层为单个leafNode上的deduce，通过一个就可以，第三层为所有可能的actionAuth，通过一个就可以
             * @param result 
             * @returns 
             */
            const checkResult = (result: (ED['actionAuth']['Schema'] | undefined)[][][]) => {
                const r = !result.find(
                    (ele) => {
                        const eleFlated = ele.flat();
                        return !eleFlated.find(
                            ele2 => !!ele2
                        );
                    }
                );
                if (!r && process.env.NODE_ENV === 'development') {
                    dlSelections.forEach(
                        (ele, idx) => {
                            const r2 = result[idx].flat();
                            if (!r2.find(ele2 => !!ele)) {
                                console.warn('对象的select权限被否决，请检查', ele);
                            }
                        }
                    )
                }
                return r;
            }

            if (actionAuths instanceof Promise) {
                assert(context instanceof AsyncContext);
                return actionAuths.then(
                    (aas) => Promise.all(dlSelections.map(
                        (ele) => Promise.all(ele.map(
                            (ele2) => Promise.all(this.checkSingleOperation(ele2.entity, ele2.filter, aas as ED['actionAuth']['Schema'][], context, ['select']))
                        ))
                    )).then(
                        (result) => checkResult(result)
                    )
                )
            }
            return checkResult(
                dlSelections.map(
                    ele => ele.map(
                        ele2 => (this.checkSingleOperation(ele2.entity, ele2.filter, actionAuths as ED['actionAuth']['Schema'][], context, ['select']) as (ED['actionAuth']['Schema'] | undefined)[])
                    )
                )
            );
        };

        if (deducedLeafSelections[0] instanceof Promise) {
            return Promise.all(deducedLeafSelections)
                .then(
                    (dls) => checkDeducedLeafSelections(dls)
                );
        }
        return checkDeducedLeafSelections(deducedLeafSelections as {
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
            actions: ED[T]['Action'][];
        }[][]);
    }

    private findActionAuthsOnNode<Cxt extends AsyncContext<ED> | SyncContext<ED>>(node: OperationTree<ED>, context: Cxt) {
        const { entity, filter, action, userRelations } = node;

        if (RelationAuth.SPECIAL_ENTITIES.includes(entity as string)) {
            // 特殊对象不用查询
            return [];
        }

        const deducedEntityFilters2 = this.getDeducedEntityFilters(entity, filter, [action], context);

        const dealWithDeducedEntityFilters = (deducedEntityFilters: {
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
            actions: ED[keyof ED]['Action'][];
        }[]) => {
            const allEntities: (keyof ED)[] = deducedEntityFilters.map(ele => ele.entity);

            // todo 这里其实可以在查询条件里通过userRelation过滤一次，但问题不大
            const actionAuths = context.select('actionAuth', {
                data: {
                    id: 1,
                    path: 1,
                    destEntity: 1,
                    deActions: 1,
                    relation: {
                        id: 1,
                        userRelation$relation: {
                            $entity: 'userRelation',
                            data: {
                                id: 1,
                                entity: 1,
                                entityId: 1,
                            },
                            filter: {
                                userId: context.getCurrentUserId(),
                            },
                        },
                    },
                },
                filter: {
                    destEntity: {
                        $in: allEntities as string[],
                    }
                }
            }, { dontCollect: true });

            const getActionAuths = (result: (ED['actionAuth']['Schema'] | undefined)[][]) => {
                const aas: ED['actionAuth']['Schema'][] = [];
                result.forEach(
                    (ele) => ele.forEach(
                        (ele2) => {
                            if (!!ele2) {
                                aas.push(ele2);
                            }
                        }
                    )
                );
                return aas;
            };

            const findOwnCreateUserRelation = (actionAuths: ED['actionAuth']['Schema'][]) => {
                if (userRelations) {
                    const ars = actionAuths.filter(
                        (ar) => !!userRelations.find(
                            (ur) => ur.relationId === ar.relationId
                        )
                    );

                    if (ars.length > 0) {
                        // 这里能找到actionAuth，其必然是本对象上的授权
                        assert(!ars.find(
                            ele => ele.path !== '' || ele.destEntity !== entity
                        ));
                        return ars;
                    }
                }
            }

            if (actionAuths instanceof Promise) {
                return actionAuths.then(
                    (ars) => {
                        const created = findOwnCreateUserRelation(ars as ED['actionAuth']['Schema'][]);
                        if (created) {
                            return created;
                        }
                        return Promise.all(
                            deducedEntityFilters.map(
                                ele => Promise.all(
                                    this.checkSingleOperation(
                                        ele.entity,
                                        ele.filter,
                                        ars as ED['actionAuth']['Schema'][],
                                        context,
                                        ele.actions
                                    )
                                )
                            )
                        ).then(
                            (result) => getActionAuths(result)
                        )
                    }
                )
            }

            assert(context instanceof SyncContext);
            const created = findOwnCreateUserRelation(actionAuths as ED['actionAuth']['Schema'][]);
            if (created) {
                return created;
            }
            return getActionAuths(
                deducedEntityFilters.map(
                    ele => (this.checkSingleOperation(
                        ele.entity,
                        ele.filter,
                        actionAuths as ED['actionAuth']['Schema'][],
                        context,
                        ele.actions
                    ) as (ED['actionAuth']['Schema'] | undefined)[])
                )
            );
        };

        if (deducedEntityFilters2 instanceof Promise) {
            return deducedEntityFilters2.then(
                (def2) => dealWithDeducedEntityFilters(def2)
            );
        }

        return dealWithDeducedEntityFilters(deducedEntityFilters2);
    }

    private checkOperationTree<Cxt extends AsyncContext<ED> | SyncContext<ED>>(tree: OperationTree<ED>, context: Cxt) {
        const actionAuths2 = this.findActionAuthsOnNode(tree, context);

        const checkChildNode = (actionAuths: ED['actionAuth']['Schema'][] | Promise<ED['actionAuth']['Schema'][]>, node: OperationTree<ED>): boolean | Promise<boolean> => {
            const checkChildNodeInner = (legalAuths: ED['actionAuth']['Schema'][]) => {
                // 因为如果children是数组的话，会把数组中所有的action并起来查询，所以在这里还要再确认一次

                const realLegalPaths = legalAuths.filter(
                    (ele) => {
                        if (ele.destEntity === node.entity && ele.deActions.includes(node.action)) {
                            return true;
                        }
                        // 有一种例外情况，是在tree的根结点findActionAuthsOnNode时，deduce出了另外一个对象的权限，此时肯定可以通过，但不能再使用这条路径对children进行进一步判断了
                        if (node === tree) {
                            return true;
                        }
                        return false;
                    }
                );
                const checkChildren = () => {
                    const { children } = node;
                    const childPath = Object.keys(children);
                    if (childPath.length === 0) {
                        return true;
                    }

                    const selfLegalPaths = realLegalPaths.filter(
                        (ele) => {
                            if (ele.destEntity === node.entity && ele.deActions.includes(node.action)) {
                                return true;
                            }
                            return false;
                        }
                    );
                    // assert(selfLegalPaths.length > 0, `对象${node.entity as string}的权限检查是用deduce的对象通过的，无法再进一步对子对象加以判断`);
                    const childResult = childPath.map(
                        (childPath) => {
                            const child = children[childPath];
                            const childEntity = child instanceof Array ? child[0].entity : child.entity;
                            // 这里如果该子结点能deduce到父，则直接通过
                            if (this.authDeduceRelationMap[childEntity]) {
                                assert(this.authDeduceRelationMap[childEntity] === 'entity');
                                const rel = judgeRelation(this.schema, childEntity, childPath);
                                if (rel === 2) {
                                    return true;
                                }
                            }

                            const pathToParent = childPath.endsWith('$entity') ? node.entity as string : childPath.split('$')[1];
                            if (child instanceof Array) {
                                const childActions = child.map(ele => ele.action);
                                const childLegalAuths = selfLegalPaths.map(
                                    (ele) => {
                                        const { path, relationId } = ele;
                                        const path2 = path ? `${pathToParent}.${path}` : pathToParent;
                                        return context.select('actionAuth', {
                                            data: {
                                                id: 1,
                                            },
                                            filter: {
                                                path: path2,
                                                destEntity: childEntity as string,
                                                deActions: {
                                                    $overlaps: childActions,
                                                },
                                                relationId: relationId || {
                                                    $exists: false,
                                                },
                                            }
                                        }, { dontCollect: true })
                                    }
                                ).flat() as ED['actionAuth']['Schema'][] | Promise<ED['actionAuth']['Schema']>[];
                                if (childLegalAuths[0] instanceof Promise) {
                                    return Promise.all(childLegalAuths).then(
                                        (clas) => child.map(
                                            (c) => checkChildNode(clas, c)
                                        )
                                    )
                                }
                                return child.map(
                                    (c) => checkChildNode(childLegalAuths as ED['actionAuth']['Schema'][], c)
                                );
                            }

                            const childLegalAuths = realLegalPaths.map(
                                (ele) => {
                                    const { path, relationId } = ele;
                                    const path2 = path ? `${pathToParent}.${path}` : pathToParent;
                                    return context.select('actionAuth', {
                                        data: {
                                            id: 1,
                                        },
                                        filter: {
                                            path: path2,
                                            destEntity: childEntity as string,
                                            deActions: {
                                                $overlaps: child.action,
                                            },
                                            relationId: relationId || {
                                                $exists: false,
                                            },
                                        }
                                    }, { dontCollect: true })
                                }
                            ).flat() as ED['actionAuth']['Schema'][] | Promise<ED['actionAuth']['Schema']>[];

                            if (childLegalAuths[0] instanceof Promise) {
                                return Promise.all(childLegalAuths).then(
                                    (clas) => checkChildNode(clas.flat(), child)
                                );
                            }
                            return checkChildNode(childLegalAuths as ED['actionAuth']['Schema'][], child);
                        }
                    ).flat();

                    if (childResult[0] instanceof Promise) {
                        return Promise.all(childResult).then(
                            (r) => !r.includes(false)
                        );
                    }
                    return !childResult.includes(false);
                };

                if (RelationAuth.SPECIAL_ENTITIES.includes(node.entity as string)) {
                    // 特殊entity走特别的路径判断
                    const result = this.checkOperateSpecialEntities2(node.entity, node.action, node.filter, context);

                    if (result instanceof Promise) {
                        return result.then(
                            (r) => {
                                if (r) {
                                    return checkChildren();
                                }
                                return false;
                            }
                        );
                    }
                    if (result) {
                        return checkChildren();
                    }
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('对象operate权限检查不通过', node);
                    }
                    return false;
                }

                if (realLegalPaths.length === 0) {
                    if (node === tree) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('对象operate权限检查不通过', node);
                        }
                        return false;
                    }
                    // 如果不是tree的根结点，相对路径上的actionAuth找不到，还可以尝试从自身的filter去重试其它路径
                    return this.checkOperationTree(node, context);
                }

                return checkChildren();
            };

            if (actionAuths instanceof Promise) {
                return actionAuths.then(
                    (aars) => checkChildNodeInner(aars)
                );
            }
            return checkChildNodeInner(actionAuths);
        };

        return checkChildNode(actionAuths2, tree);
    }

    private checkOperation<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: Omit<ED[T]['Operation'], 'id'>,
        context: Cxt,
    ) {
        const userId = context.getCurrentUserId();
        if (!userId) {
            throw new OakUnloggedInException();
        }
        if (!operation.filter && (!operation.data || operation.action !== 'create')) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('operation不能没有限制条件', operation);
            }
            return false;
        }
        const updateTree = this.destructOperation(entity, operation, userId);

        return this.checkOperationTree(updateTree, context);
    }

    /**
     * 检查一个operation是否能被通过权限测试
     * 一个cascadeOperation是一棵树形结构：
     * * 对于select，只要叶子通过其父结点必然通过；
     * * 对于update，自顶向下进行检查，若父亲被权限S通过，则只需要检查子对于S有没有相对路径上的actionAuth
     *      另外在update中，还需要考虑自建userRelation的case（例如在电子商务网站上购买商品，创建订单同时创建用户和订单的关系）
     * @param entity 
     * @param operation 
     * @param context 
     * @param actions 
     * @returns 
     */
    private checkActions2<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: Omit<ED[T]['Operation'] | ED[T]['Selection'], 'id'>,
        context: Cxt,
        actions?: ED[T]['Action'][],
    ): void | Promise<void> {
        const { action } = operation;
        if (!action || readOnlyActions.includes(action)) {
            const result = this.checkSelection(entity, operation as Omit<ED[T]['Selection'], 'id'>, context);
            if (result instanceof Promise) {
                return result.then(
                    (r) => {
                        if (!r) {
                            throw new OakUserUnpermittedException();
                        }
                    }
                );
            }
            if (!result) {
                throw new OakUserUnpermittedException();
            }
        }
        else {
            const result = this.checkOperation(entity, operation as Omit<ED[T]['Operation'], 'id'>, context);
            if (result instanceof Promise) {
                return result.then(
                    (r) => {
                        if (!r) {
                            throw new OakUserUnpermittedException();
                        }
                    }
                );
            }
            if (!result) {
                throw new OakUserUnpermittedException();
            }
        }
    }
};

/**
 * 获取有对entity进行actions操作权限的userRelation关系
 * @param params 
 * @param context 
 */
export async function getUserRelationsByActions<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>>(params: {
    entity: T;
    filter: ED[T]['Selection']['filter'];
    actions: ED[T]['Action'][];
    overlap?: boolean;
}, context: Cxt) {
    const { entity, filter, actions, overlap } = params;
    const actionAuthfilter = {
        destEntity: entity as string,
    };
    if (overlap) {
        Object.assign(actionAuthfilter, {
            deActions: {
                $overlaps: actions,
            },
        });
    }
    else {
        Object.assign(actionAuthfilter, {
            deActions: {
                $contains: actions,
            },
        });
    }

    const actionAuths = await context.select('actionAuth', {
        data: {
            id: 1,
            path: 1,
            relationId: 1,
            relation: {
                id: 1,
                entity: 1,
            },
        },
        filter: actionAuthfilter,
    }, { dontCollect: true });

    const getUserRelations = async (urAuths: Partial<ED['actionAuth']['Schema']>[]) => {
        const makeRelationIterator = (path: string, relationIds: string[]) => {
            const paths = path.split('.');

            const makeIter = (e: keyof ED, idx: number): {
                projection: ED[keyof ED]['Selection']['data'];
                getData: (d: Partial<ED[keyof ED]['Schema']>) => any;
            } => {
                if (idx === paths.length) {
                    return {
                        projection: {
                            id: 1,
                            userRelation$entity: {
                                $entity: 'userRelation',
                                data: {
                                    id: 1,
                                    relationId: 1,
                                    relation: {
                                        id: 1,
                                        name: 1,
                                    },
                                    entity: 1,
                                    entityId: 1,
                                    userId: 1,
                                },
                                filter: {
                                    relationId: {
                                        $in: relationIds,
                                    },
                                },
                            } as ED['userRelation']['Selection']
                        } as ED[keyof ED]['Selection']['data'],
                        getData: (d: Partial<ED[keyof ED]['Schema']>) => {
                            return d.userRelation$entity;
                        },
                    };
                }
                const attr = paths[idx];
                const rel = judgeRelation(context.getSchema(), e, attr);
                if (rel === 2) {
                    const { projection, getData } = makeIter(attr, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]!),
                    };
                }
                else if (typeof rel === 'string') {
                    const { projection, getData } = makeIter(rel, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]!),
                    };
                }
                else {
                    assert(rel instanceof Array);
                    const [e2, fk] = rel;
                    const { projection, getData } = makeIter(e2, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: {
                                $entity: e2,
                                data: projection,
                            },
                        },
                        getData: (d) => d[attr] && d[attr]!.map((ele: any) => getData(ele)),
                    }
                }
            };

            return makeIter(entity, 0);
        };

        // 相同的path可以groupBy掉
        const urAuthDict = groupBy(urAuths, 'path');
        const urAuthGroups = Object.keys(urAuthDict).map(
            ele => ({
                path: ele,
                relationIds: urAuthDict[ele].map(ele => ele.relationId!)
            })
        );

        const userRelations = await Promise.all(urAuthGroups.map(
            async ({ path, relationIds }) => {
                const { projection, getData } = makeRelationIterator(path, relationIds);
                const rows = await context.select(entity, {
                    data: projection,
                    filter,
                }, { dontCollect: true });
                const urs = rows.map(ele => getData(ele)).flat().filter(ele => !!ele);
                return urs as ED['userRelation']['Schema'][];
            }
        ));

        return userRelations.flat();
    };

    const getDirectUserEntities = async (directAuths: Partial<ED['actionAuth']['Schema']>[]) => {
        const makeRelationIterator = (path: string) => {
            const paths = path.split('.');

            const makeIter = (e: keyof ED, idx: number): {
                projection: ED[keyof ED]['Selection']['data'];
                getData: (d: Partial<ED[keyof ED]['Schema']>) => any;
            } => {
                const attr = paths[idx];
                const rel = judgeRelation(context.getSchema(), e, attr);
                if (idx === paths.length - 1) {
                    if (rel === 2) {
                        assert(attr === 'user');
                        return {
                            projection: {
                                id: 1,
                                entity: 1,
                                entityId: 1,
                            },
                            getData: (d) => {
                                if (d) {
                                    return {
                                        entity: e,
                                        entityId: d.id,
                                        userId: d.entityId,
                                    };
                                }
                            },
                        };
                    }
                    else {
                        assert(rel === 'user');
                        return {
                            projection: {
                                id: 1,
                                [`${attr}Id`]: 1,
                            },
                            getData: (d) => {
                                if (d) {
                                    return {
                                        entity: e,
                                        entityId: d.id,
                                        userId: d[`${attr}Id`]
                                    }
                                }
                            },
                        };
                    }
                }
                if (rel === 2) {
                    const { projection, getData } = makeIter(attr, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]!),
                    };
                }
                else if (typeof rel === 'string') {
                    const { projection, getData } = makeIter(rel, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]!),
                    };
                }
                else {
                    assert(rel instanceof Array);
                    const [e2, fk] = rel;
                    const { projection, getData } = makeIter(e2, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: {
                                $entity: e2,
                                data: projection,
                            },
                        },
                        getData: (d) => d[attr] && d[attr]!.map((ele: any) => getData(ele)),
                    }
                }
            };

            return makeIter(entity, 0);
        };
        const userEntities = await Promise.all(
            directAuths.map(
                async ({ path }) => {
                    const { getData, projection } = makeRelationIterator(path!);

                    const rows = await context.select(entity, {
                        data: projection,
                        filter,
                    }, { dontCollect: true });
                    const userEntities = rows.map(ele => getData(ele)).flat().filter(ele => !!ele);
                    return userEntities as {
                        entity: keyof ED,
                        entityId: string,
                        userId: string,
                    }[];
                }
            )
        );
        return userEntities.flat();
    };

    const urAuths2 = actionAuths.filter(
        ele => !!ele.relationId         // 有relation说明通过userRelation关联
    );
    const directAuths2 = actionAuths.filter(
        ele => !ele.relationId         // 没relation说明通过user关联
    );

    const [userRelations, userEntities] = await Promise.all([getUserRelations(urAuths2), getDirectUserEntities(directAuths2)]);

    return {
        userRelations,
        userEntities,
    };
}
