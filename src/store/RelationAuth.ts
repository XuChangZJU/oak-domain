import assert from "assert";
import { EntityDict } from "../base-app-domain";
import { OakUnloggedInException, OakUserInvisibleException, OakUserUnpermittedException, StorageSchema } from "../types";
import { EntityDict as BaseEntityDict, AuthDeduceRelationMap } from "../types/Entity";
import { AsyncContext } from "./AsyncRowStore";
import { checkFilterContains, combineFilters, getRelevantIds, translateCreateDataToFilter } from "./filter";
import { judgeRelation } from "./relation";
import { SyncContext } from "./SyncRowStore";
import { readOnlyActions } from '../actions/action';
import { difference, intersection, set, uniq, cloneDeep, groupBy } from '../utils/lodash';
import { SYSTEM_RESERVE_ENTITIES } from "../compiler/entities";
import { destructDirectUserPath, destructRelationPath } from "../utils/relationPath";


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

export class RelationAuth<ED extends EntityDict & BaseEntityDict> {
    private authDeduceRelationMap: AuthDeduceRelationMap<ED>;
    private schema: StorageSchema<ED>;
    static SPECIAL_ENTITIES = SYSTEM_RESERVE_ENTITIES;

    private selectFreeEntities: (keyof ED)[];
    private updateFreeDict: {
        [A in keyof ED]?: string[];
    };


    constructor(schema: StorageSchema<ED>,
        authDeduceRelationMap: AuthDeduceRelationMap<ED>,
        selectFreeEntities?: (keyof ED)[],
        updateFreeDict?: {
            [A in keyof ED]?: string[];
        }) {
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities || [];
        this.updateFreeDict = updateFreeDict || {};
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


    // 后台检查filter是否满足relation约束
    async checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: Omit<ED[T]['Operation'] | ED[T]['Selection'], 'id'>, context: Cxt) {
        if (context.isRoot()) {
            return;
        }

        await this.checkActions2(entity, operation, context);
    }

    /**
     * 检查当前用户有无权限对filter约束的userRelation进行action操作
     * @param context 
     * @param action 
     * @param filter 
     * @returns 
     */
    private checkUserRelation<Cxt extends AsyncContext<ED> | SyncContext<ED>>(context: Cxt, action: ED[keyof ED]['Action'], filter: NonNullable<ED['userRelation']['Selection']['filter']>) {
        const userId = context.getCurrentUserId();

        /**
         * 检查对某一个relationId是否有操作资格
         * @param destRelationId 
         * @returns 
         */
        const checkOnRelationId = (entity: keyof ED, destRelationId: string, filter: ED[keyof ED]['Selection']['filter']) => {
            /**
             * 找到能创建此relation的所有父级relation，只要user和其中一个有关联即可以通过
             */
            const relationAuths = context.select('relationAuth', {
                data: {
                    id: 1,
                    path: {
                        id: 1,
                        sourceEntity: 1,
                        destEntity: 1,
                        value: 1,
                        recursive: 1,
                    },
                    sourceRelationId: 1,
                    sourceRelation: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    destRelationId: 1,
                    destRelation: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                },
                filter: {
                    destRelationId,
                },
            }, { dontCollect: true });


            const checkRelationAuth = (relationAuth: ED['relationAuth']['Schema']) => {
                const { destRelation, sourceRelationId, path } = relationAuth;
                assert(entity === destRelation.entity);
                let destEntityFilter = this.makePathFilter(entity, path, this.schema, {
                    userRelation$entity: {
                        userId,
                        relationId: sourceRelationId,
                    },
                })!;

                if (filter) {
                    destEntityFilter = combineFilters(entity, this.schema, [destEntityFilter, filter])!;
                }

                return context.count(destRelation.entity, {
                    filter: destEntityFilter,
                }, { ignoreAttrMiss: true });
            };

            if (relationAuths instanceof Promise) {
                return relationAuths.then(
                    (ras) => Promise.all(ras.map(
                        ra => checkRelationAuth(ra as ED['relationAuth']['Schema'])
                    ))
                ).then(
                    (result) => !!result.find(ele => {
                        assert(typeof ele === 'number');
                        return ele > 0;
                    })
                );
            }

            const result = relationAuths.map(
                ra => checkRelationAuth(ra as ED['relationAuth']['Schema'])
            );
            return !!(result as number[]).find(ele => ele > 0);
        };

        /**
         * 检查对超过一个的relationId是否有操作资格
         * @param relationFilter 限定relationId的条件
         * @param intersection 是否交集（对每个relationId都得有权限）
         * @param entityFilter 限定entity的条件
         * @param entity 对应的entity
         * @attention 这里为了代码复用，有可能是要通过本函数内部来查询确定entity；所以要保证，如果传入的relationFilter就可以确定relationId，则这里的entity参数必传。
         * @returns 
         */
        const checkOnMultipleRelations = (
            relationFilter: ED['relation']['Selection']['filter'],
            intersection: boolean,
            entityFilter: ED[keyof ED]['Selection']['filter'],
            entity?: keyof ED
        ) => {
            let entity2 = entity;
            const getRelationIds = () => {
                const relevantIds = getRelevantIds(relationFilter);
                if (relevantIds.length > 0) {
                    return relevantIds;
                }

                const relations = context.select('relation', {
                    data: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    filter: relationFilter
                }, { dontCollect: true });

                if (relations instanceof Promise) {
                    return relations.then(
                        (rs) => {
                            if (!entity2) {
                                entity2 = rs[0]?.entity;
                            }
                            else {
                                assert(entity2 === rs[0]?.entity);
                            }

                            return rs.map(ele => ele.id!);
                        }
                    );
                }
                if (!entity2) {
                    entity2 = relations[0]?.entity;
                }
                else {
                    assert(entity2 === relations[0]?.entity);
                }
                return relations.map(ele => ele.id!);
            }

            const relationIds = getRelationIds();
            if (relationIds instanceof Promise) {
                return relationIds.then(
                    (ids) => {
                        return Promise.all(
                            ids.map(
                                ele => checkOnRelationId(entity2!, ele, entityFilter)
                            )
                        ).then(
                            (value) => {
                                if (intersection) {
                                    return !(value.includes(false));
                                }
                                return value.includes(true);
                            }
                        );
                    }
                );
            }
            const value = relationIds.map(ele => checkOnRelationId(entity2!, ele, entityFilter)) as boolean[];
            if (intersection) {
                return !(value.includes(false));
            }
            return value.includes(true);
        };
        if (action === 'create') {
            const { entity, entityId, relationId } = filter;
            assert(typeof entity === 'string');

            let entityFilter: ED[keyof ED]['Selection']['filter'];
            if (entityId) {
                entityFilter = {
                    id: entityId,
                };
            }
            else {
                // userEntityGrant会有这种情况，限定某个对象的范围进行授权
                entityFilter = (filter as any)[entity];
            }
            if (relationId) {
                // 如果指定relation，则测试该relation上是否可行
                // 目前可能会有多个relationIds传入（userEntityGrant做测试），但一定是可以确定的relationId集合                
                return checkOnMultipleRelations({ id: relationId }, true, entityFilter, entity);
            }
            else {
                // 否则为测试“能否”有权限管理的资格，此时只要有一个就可以
                // 这是为上层的menu所有，真正的创建不可能走到这里

                // bug fixed，目前框架不支持entityId为null，所以这里暂时只支持entityId一种方式的测试
                assert(entityId);
                return checkOnMultipleRelations({
                    entity,
                    $or: [
                        {
                            entityId: {
                                $exists: false,
                            },
                        },
                        {
                            entityId,
                        }
                    ]
                }, false, entityFilter, entity);
            }
        }
        else {
            assert(action === 'remove');
            // 有可能是删除多个userRelation，这时必须检查每一个relation都有对应的权限(有一个不能删除那就不能删除)
            return checkOnMultipleRelations({
                userRelation$relation: filter,
            }, false, {
                userRelation$entity: filter,
            }, filter.entity as string);
        }
    }

    private checkOperateSpecialEntities2<Cxt extends AsyncContext<ED> | SyncContext<ED>>(entity2: keyof ED, action: ED[keyof ED]['Action'], filter: ED[keyof ED]['Selection']['filter'], context: Cxt): boolean | Promise<boolean> {
        switch (entity2) {
            case 'userRelation': {
                assert(!(filter instanceof Array));
                return this.checkUserRelation(context, action, filter!);
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
                /**  正常情况下对modi的生成是在触发器下openRootMode，不会走到这里
                 * 但是有些例外，如extraFile如果在modi中创建，上传成功之后需要显式生成一条modi，这时对modi的
                 * 检查可以转化为对其父entity的update权限检查
                */
                assert(action === 'create');
                const { entity, entityId } = filter as EntityDict['modi']['CreateSingle']['data'];
                return this.checkOperation(entity as keyof ED, {
                    action: 'update',
                    data: {},
                    filter: {
                        id: entityId!,
                    },
                } as Omit<ED['modi']['Update'], 'id'>, context);
            }
            case 'relation': {
                // 创建relation目前不支持，以后再说
                return false;
            }
            case 'userEntityGrant': {
                // userEntityGrant的创建相当于授权，领取相当于赋权
                if (['create', 'update', 'remove'].includes(action)) {
                    if (action === 'create') {
                        const { relationEntity, relationEntityFilter, relationIds } = filter as EntityDict['userEntityGrant']['CreateSingle']['data'];
                        return this.checkOperateSpecialEntities2('userRelation', 'create', {
                            entity: relationEntity,
                            [relationEntity!]: relationEntityFilter,
                            relationId: {
                                $in: relationIds,
                            },
                        }, context);
                    }
                    return this.checkOperateSpecialEntities2('userRelation', 'action', {
                        relation: {
                            userEntityGrant$relation: filter,
                        },
                    }, context);
                }
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
                /* if (!RelationAuth.SPECIAL_ENTITIES.includes(deduceEntity as string)) {
                    return this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions, context);
                }
                return []; */
                return this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions, context);
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
                        id: deducedEntityId,
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
                            filter: combineFilters(e, this.schema, [{
                                [foreignKey.slice(0, foreignKey.length - 2)]: filter,
                            }, data[attr].filter || {}]),
                        } as any);
                    }
                    else {
                        if (!this.authDeduceRelationMap[e]) {
                            hasOneToMany = true;
                            destructInner(e, {
                                data: data[attr].data,
                                filter: combineFilters(e, this.schema, [{
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
                return translateCreateDataToFilter(this.schema, entity, data);
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

        const destructInner = <T2 extends keyof ED>(
            entity: T2,
            operation: Omit<ED[T2]['Operation'], 'id'>,
            // extraFilter?: ED[T2]['Selection']['filter'],
            path?: string,
            child?: OperationTree<ED>,
            hasParent?: true,
            extraFilter?: ED[T2]['Selection']['filter']): OperationTree<ED> => {
            const { action, data, filter } = operation;
            const filter2 = action === 'create' ? makeCreateFilter(entity, operation as Omit<ED[T]['CreateSingle'], 'id'>) : cloneDeep(filter);
            assert(filter2);
            if (extraFilter) {
                Object.assign(filter2, extraFilter);
            }
            // const filter3 = extraFilter ? combineFilters(entity, schema, [filter2, extraFilter]) : filter2;

            const me: OperationTree<ED> = {
                entity: entity,
                filter: filter2,
                children: {},
                action,
            };
            let root = me;

            // 如果当前对象是一个toModi的，意味着它的cascadeUpdate会全部被变为modi去缓存，因此不需要再向下检查了
            // modi被apply时，这些modi产生的更新才会被实际检查
            // 这里可能有问题，再思考思考 by Xc 20231111
            const isModiUpdate = this.schema[entity].toModi && action !== 'remove';

            if (child) {
                assert(path);
                addChild(me, path, child);
            }

            assert(!(data instanceof Array));

            for (const attr in data) {
                const rel = judgeRelation(this.schema, entity, attr);
                if (rel === 2 && !isModiUpdate) {
                    assert(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    const mtoOperation = data[attr] as any;
                    root = destructInner(attr, mtoOperation, `${entity as string}$entity`, me);
                }
                else if (typeof rel === 'string' && !isModiUpdate) {
                    assert(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(rel, data[attr] as any, `${entity as string}$${attr}`, me);
                }
                else if (rel instanceof Array && !isModiUpdate) {
                    const [e, f] = rel;
                    const otmOperations = data[attr];
                    /**
                    * 这里目前在cascadeUpdate的过程中，只有当一对多个userRelation的操作需要将entity和entityId复制到子对象上
                    * 因为对userRelation的判断是走的特殊路径，无法利用父对象的actionAuth
                    * 其它对象情况不需要复制，因为应用中必须要能保证（前台传来的）父对象的filter不依赖于子对象的条件
                    */
                    let extraFilter = undefined as any;
                    if (e === 'userRelation' && entity !== 'user') {
                        me.userRelations = [];
                        extraFilter = {
                            entity,
                            entityId: filter2.id!,
                        }
                        const dealWithUserRelation = (userRelation: ED['userRelation']['CreateSingle']) => {
                            const { action, data } = userRelation;
                            if (action === 'create') {
                                const attrs = Object.keys(data);
                                assert(difference(attrs, Object.keys(this.schema.userRelation.attributes).concat('id')).length === 0);
                                if (data.userId === userId) {
                                    me.userRelations?.push(data as ED['userRelation']['OpSchema']);
                                }

                                assert(filter2.id);
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
                    if (otmOperations instanceof Array) {
                        otmOperations.forEach(
                            (otmOperation) => {
                                const son = destructInner(e, otmOperation, undefined, undefined, true, extraFilter);
                                addChild(me, attr, son);
                            }
                        )
                    }
                    else {
                        const son = destructInner(e, otmOperations as any, undefined, undefined, true, extraFilter);
                        addChild(me, attr, son);
                    }
                }

            }

            return root;
        };

        return destructInner(entity2, operation2);
    }

    private makePathFilter<T extends keyof ED>(entity: T, path: ED['path']['OpSchema'], schema: StorageSchema<ED>, filter: ED[keyof ED]['Selection']['filter']): ED[keyof ED]['Selection']['filter'] {
        const { value, recursive } = path;

        if (value === '') {
            assert(!recursive);
            return filter;
        }

        const paths = value.split('.');

        const makeRecursiveFilter = (recursiveDepth: number): ED[keyof ED]['Selection']['filter'] => {
            if (recursiveDepth > 0) {
                return {
                    $or: [
                        filter,
                        {
                            parent: makeRecursiveFilter(recursiveDepth - 1)
                        }
                    ]
                };
            }
            return filter;
        };

        const makeInner = (idx: number, e2: keyof ED): ED[keyof ED]['Selection']['filter'] => {
            const attr = paths[idx];
            if (idx === paths.length) {
                if (!recursive) {
                    return filter;
                }
                else {
                    // 在最后一个对象上存在递归，用or连接处理
                    const { recursiveDepth } = schema[e2];
                    assert(recursiveDepth! > 0);
                    return makeRecursiveFilter(recursiveDepth!);
                }
            }
            else {
                const rel = judgeRelation(schema, e2, attr);
                let e3;
                if (rel === 2) {
                    e3 = attr;
                }
                else if (typeof rel === 'string') {
                    e3 = rel;
                }
                else {
                    assert(rel instanceof Array);
                    e3 = rel[0];
                }
                const f = makeInner(idx + 1, e3);
                return {
                    [attr]: f,
                };
            }
        };
        return makeInner(0, entity);
    }

    /**
     * 对所有满足操作要求的actionAuth加以判断，找到可以满足当前用户身份的actionAuth
     * @param entity 
     * @param filter 
     * @param actionAuths 
     * @param context 
     * @return
     */
    private filterActionAuths<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        filter: ED[T]['Selection']['filter'],
        actionAuths: ED['actionAuth']['Schema'][],
        context: Cxt,
    ) {
        const result = actionAuths.map(
            (ele) => {
                const { path, relation, relationId } = ele;

                // 在cache中，可能出现relation外键指向的对象为null的情况，要容错
                if (relationId) {
                    if (relation) {
                        const { userRelation$relation: userRelations } = relation;
                        if (userRelations!.length > 0) {
                            const entityIds = uniq(userRelations!.map(ele => ele.entityId));
                            const pathFilter = this.makePathFilter(entity, path, this.schema, {
                                id: entityIds.length > 0 ? {
                                    $in: entityIds,
                                } : entityIds[0],
                            });
                            const contains = checkFilterContains(entity, context, pathFilter, filter, true)
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
                    }
                    return;
                }
                // 说明是通过userId关联
                const pathFilter = this.makePathFilter(entity, path, this.schema, {
                    id: context.getCurrentUserId()!,
                });
                const contains = checkFilterContains(entity, context, pathFilter, filter, true);
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
            }
        );

        if (result.find(ele => ele instanceof Promise)) {
            return Promise.all(result).then(
                (r2) => r2.filter(
                    ele => !!ele
                ) as ED['actionAuth']['Schema'][]
            );
        }

        return result.filter(
            ele => !!ele
        ) as ED['actionAuth']['Schema'][];
    }

    /**
     * 对于有些特殊的查询（带很多$or的查询，多发生在系统级别），单个actionAuth无法满足，需要共同加以判定
     * @param entity 
     * @param filter 
     * @param actionAuths 
     * @param context 
     * @param actions 
     */
    private checkActionAuthInGroup<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        filter: ED[T]['Selection']['filter'],
        actionAuths: ED['actionAuth']['Schema'][],
        context: Cxt,
    ) {
        const filters = actionAuths.filter(
            ele => ele.path.destEntity === entity
        ).map(
            (ele) => {
                const { path, relation, relationId } = ele;
                if (relationId) {
                    const pathFilter = this.makePathFilter(entity, path, this.schema, {
                        userRelation$entity: {
                            userId: context.getCurrentUserId()!,
                            relationId,
                        }
                    });
                    return pathFilter;
                }
                // 说明是通过userId关联
                return this.makePathFilter(entity, path, this.schema, {
                    id: context.getCurrentUserId()!,
                });
            }
        );

        const groupFilter = combineFilters(entity, this.schema, filters, true);

        if (groupFilter) {
            return checkFilterContains(entity, context, groupFilter, filter, true);
        }
        return false;
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
                    path: {
                        id: 1,
                        value: 1,
                        sourceEntity: 1,
                        destEntity: 1,
                        recursive: 1,
                    },
                    deActions: 1,
                    relationId: 1,
                },
                filter: {
                    deActions: {
                        $contains: 'select',
                    },
                    path: {
                        destEntity: {
                            $in: allEntities as string[],
                        },
                    },
                }
            }, { dontCollect: true, ignoreAttrMiss: true });

            /**
             * 返回的结果中，第一层为leafNode，必须全通过，第二层为单个leafNode上的deduce，通过一个就可以
             * @param result 
             * @returns 
             */
            const checkResult = (result: boolean[][]) => {
                let idx = 0;
                for (const r1 of result) {
                    const r2 = r1.find(ele => ele === true);
                    if (!r2) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('对象的select权限被否决，请检查', dlSelections[idx]);
                        }
                        idx++;
                        return false;
                    }
                    idx++;
                }
                return true;
            };

            if (actionAuths instanceof Promise) {
                assert(context instanceof AsyncContext);
                return actionAuths.then(
                    (aas) => Promise.all(dlSelections.map(
                        (ele) => Promise.all(ele.map(
                            (ele2) => this.checkActionAuthInGroup(ele2.entity, ele2.filter, aas as ED['actionAuth']['Schema'][], context)
                        ))
                    )).then(
                        (result) => checkResult(result)
                    )
                )
            }
            return checkResult(
                dlSelections.map(
                    ele => ele.map(
                        ele2 => (this.checkActionAuthInGroup(ele2.entity, ele2.filter, actionAuths as ED['actionAuth']['Schema'][], context) as boolean)
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

    /**
     * 此函数判定一个结点是否能通过权限检测，同时寻找该结点本身对象上成立的actionAuth，用于本结点子孙结点的快速检测
     * 如果结点因其deduce的对象通过了检测，其被推断对象的actionAuth无法用于更低对象的权限检测
     * @param node 
     * @param context 
     * @returns 
     */
    private findActionAuthsOnNode<Cxt extends AsyncContext<ED> | SyncContext<ED>>(node: OperationTree<ED>, context: Cxt) {
        const { entity, filter, action, userRelations } = node;

        const deducedEntityFilters2 = this.getDeducedEntityFilters(entity, filter, [action], context);


        /**
         * 搜索判定是否允许自建对象，自建的条件是 path = ''，destEntity === entity
         * @param actionAuths 
         * @returns 
         */
        const findOwnCreateUserRelation = (actionAuths: ED['actionAuth']['Schema'][]) => {
            if (userRelations && userRelations.length > 0) {
                const ars = actionAuths.filter(
                    (ar) => !!userRelations.find(
                        (ur) => ur.relationId === ar.relationId
                    ) && ar.path.value === '' && ar.path.destEntity === entity
                );

                if (ars.length > 0) {
                    return ars;
                }
            }
        };


        const actionAuthOnEntities: ED['actionAuth']['Schema'][] = [];
        const dealWithDeducedEntityFilters = (deducedEntityFilters: {
            entity: keyof ED;
            filter: ED[keyof ED]['Selection']['filter'];
            actions: ED[keyof ED]['Action'][];
        }[]) => {
            const specialEntities = deducedEntityFilters.filter(
                ele => RelationAuth.SPECIAL_ENTITIES.includes(ele.entity as string)
            );
            const unspecicalEntities = deducedEntityFilters.filter(
                ele => !RelationAuth.SPECIAL_ENTITIES.includes(ele.entity as string)
            );

            const result: (boolean | Promise<boolean>)[] = [];
            if (specialEntities.length > 0) {
                // 对于deduce出来的special对象，直接判定create应该问题不大，否则写起来太烦琐（具体情况遇到了再调试）
                result.push(
                    ...specialEntities.map(
                        ele => this.checkOperateSpecialEntities2(ele.entity, ele.entity === entity ? node.action : 'create', ele.filter, context)
                    )
                );
            }
            if (unspecicalEntities.length > 0) {
                const allEntities: (keyof ED)[] = unspecicalEntities.map(ele => ele.entity);
                const allActions = uniq(unspecicalEntities.map(ele => ele.actions).flat());

                const actionAuths2 = context.select('actionAuth', {
                    data: {
                        id: 1,
                        path: {
                            id: 1,
                            destEntity: 1,
                            sourceEntity: 1,
                            value: 1,
                            recursive: 1,
                        },
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
                        path: {
                            destEntity: {
                                $in: allEntities as string[],
                            }
                        },
                        deActions: {
                            $overlaps: allActions,
                        },
                    }
                }, { dontCollect: true, ignoreAttrMiss: true });

                const checkActionAuths = (actionAuths: ED['actionAuth']['Schema'][]) => {
                    const created = findOwnCreateUserRelation(actionAuths);
                    if (created) {
                        actionAuthOnEntities.push(...created);
                        return true;
                    }

                    const result = deducedEntityFilters.map(
                        (ele) => {
                            const ars2 = actionAuths.filter(
                                ele2 => ele2.path.destEntity === ele.entity && intersection(ele2.deActions, ele.actions).length > 0     // 这里只要overlap就可以了
                            );

                            const ars3 = this.filterActionAuths(ele.entity, ele.filter, ars2, context);

                            const checkFilteredArs = (actionAuths2: ED['actionAuth']['Schema'][]) => {
                                if (actionAuths2.length > 0) {
                                    if (ele.entity === entity) {
                                        actionAuthOnEntities.push(...actionAuths2);
                                    }
                                    return true;
                                }
                                return false;
                            };
                            if (ars3 instanceof Promise) {
                                return ars3.then(
                                    (ars4) => checkFilteredArs(ars4)
                                );
                            }
                            return checkFilteredArs(ars3);
                        }
                    );

                    if (result.find(ele => ele instanceof Promise)) {
                        return Promise.all(result).then(
                            (r2) => r2.includes(true)
                        )
                    }
                    return result.includes(true);
                };
                if (actionAuths2 instanceof Promise) {
                    result.push(
                        actionAuths2.then(
                            (ars2) => checkActionAuths(ars2 as ED['actionAuth']['Schema'][])
                        )
                    );
                }
                else {
                    result.push(
                        checkActionAuths(actionAuths2 as ED['actionAuth']['Schema'][])
                    );
                }
            }

            if (result.find(ele => ele instanceof Promise)) {
                return Promise.all(result).then(
                    (r2) => {
                        // r2中只有一个通过就能通过
                        if (r2.includes(true)) {
                            return actionAuthOnEntities;
                        }
                        return false;
                    }
                );
            }

            if (result.includes(true)) {
                return actionAuthOnEntities;
            }
            return false;
        };

        if (deducedEntityFilters2 instanceof Promise) {
            return deducedEntityFilters2.then(
                (def2) => dealWithDeducedEntityFilters(def2)
            );
        }

        return dealWithDeducedEntityFilters(deducedEntityFilters2);
    }

    private checkOperationTree2<Cxt extends AsyncContext<ED> | SyncContext<ED>>(tree: OperationTree<ED>, context: Cxt) {
        const checkNode = (node: OperationTree<ED>, actionAuths?: ED['actionAuth']['Schema'][]): boolean | Promise<boolean> => {
            const checkChildren = (legalPaths: ED['actionAuth']['Schema'][]) => {
                const { children } = node;
                const childPath = Object.keys(children);
                if (childPath.length === 0) {
                    return true;
                }

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
                            const childLegalAuths = legalPaths.map(
                                (ele) => {
                                    const { path: { value: pv }, relationId } = ele;
                                    const pv2 = pv ? `${pathToParent}.${pv}` : pathToParent
                                    return context.select('actionAuth', {
                                        data: {
                                            id: 1,
                                        },
                                        filter: {
                                            path: {
                                                value: pv2,
                                                destEntity: childEntity as string,
                                            },
                                            deActions: {
                                                $overlaps: childActions,
                                            },
                                            relationId: relationId || {
                                                $exists: false,
                                            },
                                        }
                                    }, { dontCollect: true })
                                }
                            ) as ED['actionAuth']['Schema'][][] | Promise<ED['actionAuth']['Schema']>[][];
                            if (childLegalAuths[0] instanceof Promise) {
                                return Promise.all(childLegalAuths).then(
                                    (clas) => child.map(
                                        (c) => checkNode(c, clas.flat() as ED['actionAuth']['Schema'][])
                                    )
                                )
                            }
                            return child.map(
                                (c) => checkNode(c, childLegalAuths.flat() as ED['actionAuth']['Schema'][])
                            );
                        }

                        const childLegalAuths = legalPaths.map(
                            (ele) => {
                                const { path: { value: pv }, relationId } = ele;
                                const pv2 = pv ? `${pathToParent}.${pv}` : pathToParent
                                return context.select('actionAuth', {
                                    data: {
                                        id: 1,
                                    },
                                    filter: {
                                        path: {
                                            value: pv2,
                                            destEntity: childEntity as string,
                                        },
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
                                (clas) => checkNode(child, clas.flat())
                            );
                        }
                        return checkNode(child, childLegalAuths as ED['actionAuth']['Schema'][]);
                    }
                ).flat();

                if (childResult[0] instanceof Promise) {
                    return Promise.all(childResult).then(
                        (r) => !r.includes(false)
                    );
                }
                return !childResult.includes(false);
            };

            // 先根据parent传下来的合法auths来搜寻，只需要查找actionAuth，降低开销
            // 这里有可能父结点根据actionAuths能通过，但子结点需要重新搜索父结点上的新actionAuths才能通过吗？应该不存在这种情况。 by Xc 20230824
            if (actionAuths && actionAuths.length > 0) {
                return checkChildren(actionAuths);
            }

            // 没有能根据父亲传下来的actionAuth判定，只能自己找
            const result = this.findActionAuthsOnNode(node, context);

            const checkResult = (result2: false | ED['actionAuth']['Schema'][]) => {
                if (result2 === false) {
                    return false;
                }
                // 如果是对user对象操作通过，需要增添一条虚假的的actionAuth
                if (node.entity === 'user') {
                    result2.push({
                        id: 'temp',
                        pathId: 'path_temp',
                        path: {
                            id: 'path_temp',
                            destEntity: 'user',
                            sourceEntity: 'any',
                            value: '',
                            $$createAt$$: 1,
                            $$updateAt$$: 1,
                            $$seq$$: 123,
                            recursive: false,
                        },
                        $$createAt$$: 1,
                        $$updateAt$$: 1,
                        $$seq$$: 123,
                        deActions: [node.action],
                    });
                }
                return checkChildren(result2);
            }
            if (result instanceof Promise) {
                return result.then(
                    (r2) => checkResult(r2)
                );
            }

            return checkResult(result);
        };

        return checkNode(tree);
    }


    private checkOperation<T extends keyof ED, Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: T,
        operation: Omit<ED[T]['Operation'], 'id'>,
        context: Cxt,
    ) {
        const { action, filter, data } = operation;
        if (this.updateFreeDict[entity] && this.updateFreeDict[entity]!.includes(action)) {
            return true;
        }
        const userId = context.getCurrentUserId();
        if (!userId) {
            throw new OakUnloggedInException();
        }
        if (!filter && (!data || action !== 'create')) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('operation不能没有限制条件', operation);
            }
            return false;
        }
        const updateTree = this.destructOperation(entity, operation, userId);

        return this.checkOperationTree2(updateTree, context);
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
                            throw new OakUserInvisibleException<ED, T>(entity, operation as ED[T]['Operation']);
                        }
                    }
                );
            }
            if (!result) {
                throw new OakUserInvisibleException<ED, T>(entity, operation as ED[T]['Operation']);
            }
        }
        else {
            const result = this.checkOperation(entity, operation as Omit<ED[T]['Operation'], 'id'>, context);
            if (result instanceof Promise) {
                return result.then(
                    (r) => {
                        if (!r) {
                            throw new OakUserUnpermittedException<ED, T>(entity, operation as ED[T]['Operation']);
                        }
                    }
                );
            }
            if (!result) {
                throw new OakUserUnpermittedException<ED, T>(entity, operation as ED[T]['Operation']);
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
        path: {
            destEntity: entity as string,
        },
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
            path: {
                id: 1,
                value: 1,
                destEntity: 1,
                recursive: 1,
            },
            relationId: 1,
            relation: {
                id: 1,
                entity: 1,
            },
        },
        filter: actionAuthfilter,
    }, { dontCollect: true });

    const getUserRelations = async (urAuths: Partial<ED['actionAuth']['Schema']>[]) => {
        // 相同的path可以groupBy掉
        const urAuthDict2: Record<string, [string[], boolean]> = {};
        urAuths.forEach(
            (auth) => {
                const { path, relationId } = auth;
                const { value, recursive } = path!;

                if (!urAuthDict2[value]) {
                    urAuthDict2[value] = [[relationId!], recursive!];
                }
                else if (!urAuthDict2[value][0].includes(relationId!)) {
                    assert(urAuthDict2[value][1] === recursive);
                    urAuthDict2[value][0].push(relationId!);
                }
            }
        );

        const userRelations = await Promise.all(Object.keys(urAuthDict2).map(
            async (path) => {
                const [relationIds, recursive] = urAuthDict2[path];
                const { projection, getData } = destructRelationPath(context.getSchema(), entity, path, {
                    relationId: {
                        $in: relationIds,
                    },
                }, recursive);
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
        const userEntities = await Promise.all(
            directAuths.map(
                async ({ path }) => {
                    const { value, recursive } = path!;
                    assert(!recursive);
                    const { getData, projection } = destructDirectUserPath(context.getSchema(), entity, value!);

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
