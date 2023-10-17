"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRelationsByActions = exports.RelationAuth = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const types_1 = require("../types");
const AsyncRowStore_1 = require("./AsyncRowStore");
const filter_1 = require("./filter");
const relation_1 = require("./relation");
const action_1 = require("../actions/action");
const lodash_1 = require("../utils/lodash");
const env_1 = require("../compiler/env");
class RelationAuth {
    actionCascadePathGraph;
    relationCascadePathGraph;
    authDeduceRelationMap;
    schema;
    static SPECIAL_ENTITIES = env_1.SYSTEM_RESERVE_ENTITIES;
    selectFreeEntities;
    createFreeEntities;
    updateFreeEntities;
    constructor(schema, actionCascadePathGraph, relationCascadePathGraph, authDeduceRelationMap, selectFreeEntities, createFreeEntities, updateFreeEntities) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.selectFreeEntities = selectFreeEntities || [];
        this.createFreeEntities = createFreeEntities || [];
        this.updateFreeEntities = updateFreeEntities || [];
        this.authDeduceRelationMap = Object.assign({}, authDeduceRelationMap, {
            modi: 'entity',
        });
    }
    // 前台检查filter是否满足relation约束
    checkRelationSync(entity, operation, context) {
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
    getGrantedRelationIds(entity, entityId, context) {
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
                    entity: entity,
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
            return result.then((r2) => r2.map(ele => ele.destRelation));
        }
        return result.map(ele => ele.destRelation);
    }
    // 后台检查filter是否满足relation约束
    async checkRelationAsync(entity, operation, context) {
        if (context.isRoot()) {
            return;
        }
        await this.checkActions2(entity, operation, context);
    }
    checkOperateSpecialEntities2(entity2, action, filter, context) {
        switch (entity2) {
            case 'userRelation': {
                (0, assert_1.default)(!(filter instanceof Array));
                (0, assert_1.default)(['create', 'remove'].includes(action));
                if (action === 'create') {
                    (0, assert_1.default)(!(filter instanceof Array));
                    const { entity, entityId, relationId } = filter;
                    // 创建userRelation如果是领取动作，先暂使用root身份通过
                    const destRelations = this.getGrantedRelationIds(entity, entityId, context);
                    if (destRelations instanceof Promise) {
                        return destRelations.then((r2) => {
                            if (relationId && !r2.find(ele => ele.id === relationId) || r2.length === 0) {
                                return false;
                            }
                            return true;
                        });
                    }
                    // 若指定了要create的relation，则必须有该relationId存在，否则只要有任意可授权的relation即可
                    if (relationId && !destRelations.find(ele => ele.id === relationId) || destRelations.length === 0) {
                        return false;
                    }
                    return true;
                }
                else {
                    (0, assert_1.default)(action === 'remove');
                    const userId = context.getCurrentUserId();
                    (0, assert_1.default)(filter);
                    const contained = {
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
                    return (0, filter_1.checkFilterContains)(entity2, context, contained, filter, true);
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
                (0, assert_1.default)(false, `对象${entity2}的权限控制没有加以控制`);
            }
        }
    }
    getDeducedEntityFilters(entity, filter, actions, context) {
        const entityFilters = [
            {
                entity,
                filter,
                actions,
            }
        ];
        if (this.authDeduceRelationMap[entity]) {
            (0, assert_1.default)(this.authDeduceRelationMap[entity] === 'entity');
            let { entity: deduceEntity, entityId: deduceEntityId } = filter;
            let deduceFilter = {};
            if (deduceEntity && deduceEntityId) {
                deduceFilter = { id: deduceEntityId };
            }
            else {
                // 也可能是用cascade方式进行查找，这里有时候filter上会带有两个不同的entity目标，尚未处理（todo!）
                const { ref } = this.schema[entity].attributes.entity;
                (0, assert_1.default)(ref instanceof Array);
                for (const refEntity of ref) {
                    if (filter[refEntity]) {
                        deduceEntity = refEntity;
                        deduceFilter = filter[refEntity];
                        break;
                    }
                }
            }
            const getRecursiveDeducedFilters = (deduceEntity, deduceFilter) => {
                const excludeActions = action_1.readOnlyActions.concat([ /* 'create', 'remove' */]);
                const updateActions = this.schema[deduceEntity].actions.filter((a) => !excludeActions.includes(a));
                /* if (!RelationAuth.SPECIAL_ENTITIES.includes(deduceEntity as string)) {
                    return this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions, context);
                }
                return []; */
                return this.getDeducedEntityFilters(deduceEntity, deduceFilter, actions[0] === 'select' ? actions : updateActions, context);
            };
            if (deduceEntity && deduceFilter) {
                const deducedSelections = getRecursiveDeducedFilters(deduceEntity, deduceFilter);
                if (deducedSelections instanceof Promise) {
                    return deducedSelections.then((ds) => {
                        entityFilters.push(...ds);
                        return entityFilters;
                    });
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
                const dealWithData = (rows) => {
                    // 这里如果entity指向不同的实体，一般出现这样的查询，则其权限应当不由这条deduce路径处理
                    // 同上，如果找到的行数大于1行，说明deduce路径上的对象不确定，也暂不处理  by Xc 20230725
                    if (rows.length > 1 || rows.length === 0) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn(`进行deduce推导时找到了${rows.length}行${entity}数据`);
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
                        return result.then((r2) => {
                            entityFilters.push(...r2);
                            return entityFilters;
                        });
                    }
                    entityFilters.push(...result);
                    return entityFilters;
                };
                if (rows2 instanceof Promise) {
                    return rows2.then((r2) => dealWithData(r2));
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
    destructSelection(entity, selection) {
        const leafSelections = [];
        const destructInner = (entity2, selection2) => {
            const { data, filter } = selection2;
            let hasOneToMany = false;
            for (const attr in data) {
                const rel = (0, relation_1.judgeRelation)(this.schema, entity2, attr);
                if (rel instanceof Array) {
                    const [e, foreignKey] = rel;
                    if (foreignKey) {
                        (0, assert_1.default)(!this.authDeduceRelationMap[e]);
                        hasOneToMany = true;
                        destructInner(e, {
                            data: data[attr].data,
                            filter: (0, filter_1.combineFilters)(e, this.schema, [{
                                    [foreignKey.slice(0, foreignKey.length - 2)]: filter,
                                }, data[attr].filter || {}]),
                        });
                    }
                    else {
                        if (!this.authDeduceRelationMap[e]) {
                            hasOneToMany = true;
                            destructInner(e, {
                                data: data[attr].data,
                                filter: (0, filter_1.combineFilters)(e, this.schema, [{
                                        [entity2]: filter,
                                    }, data[attr].filter || {}]),
                            });
                        }
                        else {
                            (0, assert_1.default)(this.authDeduceRelationMap[e] === 'entity');
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
        destructInner(entity, (0, lodash_1.cloneDeep)(selection));
        return leafSelections;
    }
    /**
     * 对于operation，解构出一个树形结构，以方便自顶向下的进行访问
     * 但对于deduce的子对象，不必再向底层查看
     * @param entity
     * @param selection
     */
    destructOperation(entity2, operation2, userId) {
        /**
         * 对create动作，把data中的cascade部分剔除后作为filter参与后续的检验
         * @param operation
         * @returns
         */
        const makeCreateFilter = (entity, operation) => {
            const { data, filter } = operation;
            (0, assert_1.default)(!(data instanceof Array));
            if (data) {
                const data2 = {};
                for (const attr in data) {
                    const rel = (0, relation_1.judgeRelation)(this.schema, entity, attr);
                    if (rel === 1) {
                        // 只需要记住id和各种外键属性，不这样处理有些古怪的属性比如coordinate，其作为createdata和作为filter并不同构
                        if ((['id', 'entity', 'entityId'].includes(attr) || this.schema[entity].attributes[attr]?.type === 'ref') && typeof data[attr] === 'string') {
                            data2[attr] = data[attr];
                        }
                    }
                }
                return data2;
            }
            return filter;
        };
        const addChild = (node, path, child) => {
            // 在这里要把可以被node deduce出来的child处理掉
            const paths = path.split('$');
            (0, assert_1.default)(paths.length >= 2);
            if (this.authDeduceRelationMap[child.entity] === paths[1]) {
                (0, assert_1.default)(paths[1] === 'entity', '当前只支持entity外键上的deduce');
                return false;
            }
            if (node.children[path]) {
                if (node.children[path] instanceof Array) {
                    node.children[path].push(child);
                }
                else {
                    node.children[path] = [node.children[path], child];
                }
            }
            else {
                Object.assign(node.children, {
                    [path]: child,
                });
            }
            return true;
        };
        const destructInner = (entity, operation, 
        // extraFilter?: ED[T2]['Selection']['filter'],
        path, child, hasParent) => {
            const { action, data, filter } = operation;
            const filter2 = action === 'create' ? makeCreateFilter(entity, operation) : filter;
            (0, assert_1.default)(filter2);
            // const filter3 = extraFilter ? combineFilters(entity, schema, [filter2, extraFilter]) : filter2;
            const me = {
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
                (0, assert_1.default)(path);
                addChild(me, path, child);
            }
            for (const attr in data) {
                const rel = (0, relation_1.judgeRelation)(this.schema, entity, attr);
                if (rel === 2 && !isModiUpdate) {
                    (0, assert_1.default)(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(attr, data[attr], `${entity}$entity`, me);
                }
                else if (typeof rel === 'string' && !isModiUpdate) {
                    (0, assert_1.default)(root === me && !hasParent, 'cascadeUpdate必须是树结构，避免森林');
                    root = destructInner(rel, data[attr], `${entity}$${attr}`, me);
                }
                else if (rel instanceof Array && !isModiUpdate) {
                    const [e, f] = rel;
                    const otmOperations = data[attr];
                    if (e === 'userRelation' && entity !== 'user') {
                        me.userRelations = [];
                        const dealWithUserRelation = (userRelation) => {
                            const { action, data } = userRelation;
                            if (action === 'create') {
                                const attrs = Object.keys(data);
                                (0, assert_1.default)((0, lodash_1.difference)(attrs, Object.keys(this.schema.userRelation.attributes).concat('id')).length === 0);
                                if (data.userId === userId) {
                                    me.userRelations?.push(data);
                                }
                            }
                        };
                        if (otmOperations instanceof Array) {
                            otmOperations.forEach((otmOperation) => dealWithUserRelation(otmOperation));
                        }
                        else {
                            dealWithUserRelation(otmOperations);
                        }
                    }
                    if (otmOperations instanceof Array) {
                        otmOperations.forEach((otmOperation) => {
                            const son = destructInner(e, otmOperation, undefined, undefined, true);
                            addChild(me, attr, son);
                        });
                    }
                    else {
                        const son = destructInner(e, otmOperations, undefined, undefined, true);
                        addChild(me, attr, son);
                    }
                }
            }
            return root;
        };
        return destructInner(entity2, (0, lodash_1.cloneDeep)(operation2));
    }
    /**
     * 对所有满足操作要求的actionAuth加以判断，找到可以满足当前用户身份的actionAuth
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @return
     */
    filterActionAuths(entity, filter, actionAuths, context) {
        const result = actionAuths.map((ele) => {
            const { paths, relation, relationId } = ele;
            // 在cache中，可能出现relation外键指向的对象为null的情况，要容错
            if (relationId) {
                if (relation) {
                    const { userRelation$relation: userRelations } = relation;
                    if (userRelations.length > 0) {
                        const entityIds = (0, lodash_1.uniq)(userRelations.map(ele => ele.entityId));
                        const idFilter = entityIds.length > 1 ? {
                            $in: entityIds,
                        } : entityIds[0];
                        (0, assert_1.default)(idFilter);
                        const pathFilters = paths.map((path) => {
                            if (path) {
                                return (0, lodash_1.set)({}, path, {
                                    id: idFilter,
                                });
                            }
                            return {
                                id: idFilter,
                            };
                        });
                        // 这里是或关系，只要对象落在任意一条路径上就可以
                        const contained = (0, filter_1.combineFilters)(entity, context.getSchema(), pathFilters, true);
                        const contains = (0, filter_1.checkFilterContains)(entity, context, contained, filter, true);
                        if (contains instanceof Promise) {
                            return contains.then((c) => {
                                if (c) {
                                    return ele;
                                }
                                return;
                            });
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
            const pathFilters = paths.map((path) => (0, lodash_1.set)({}, `${path}.id`, context.getCurrentUserId()));
            const contained = (0, filter_1.combineFilters)(entity, context.getSchema(), pathFilters, true);
            const contains = (0, filter_1.checkFilterContains)(entity, context, contained, filter, true);
            if (contains instanceof Promise) {
                return contains.then((c) => {
                    if (c) {
                        return ele;
                    }
                    return;
                });
            }
            if (contains) {
                return ele;
            }
        });
        if (result.find(ele => ele instanceof Promise)) {
            return Promise.all(result).then((r2) => r2.filter(ele => !!ele));
        }
        return result.filter(ele => !!ele);
    }
    /**
     * 对于有些特殊的查询（带很多$or的查询，多发生在系统级别），单个actionAuth无法满足，需要共同加以判定
     * @param entity
     * @param filter
     * @param actionAuths
     * @param context
     * @param actions
     */
    checkActionAuthInGroup(entity, filter, actionAuths, context) {
        const filters = actionAuths.filter(ele => ele.destEntity === entity).map((ele) => {
            const { paths, relation, relationId } = ele;
            if (relationId) {
                (0, assert_1.default)(relation);
                const { userRelation$relation: userRelations } = relation;
                (0, assert_1.default)(userRelations.length > 0);
                const entityIds = (0, lodash_1.uniq)(userRelations.map(ele => ele.entityId));
                const idFilter = entityIds.length > 1 ? {
                    $in: entityIds,
                } : entityIds[0];
                (0, assert_1.default)(idFilter);
                const pathFilters = paths.map((path) => {
                    if (path) {
                        return (0, lodash_1.set)({}, path, {
                            id: idFilter,
                        });
                    }
                    return {
                        id: idFilter
                    };
                });
                return pathFilters;
            }
            // 说明是通过userId关联
            return paths.map((path) => (0, lodash_1.set)({}, `${path}.id`, context.getCurrentUserId()));
        });
        const groupFilter = (0, filter_1.combineFilters)(entity, this.schema, filters.flat(), true);
        if (groupFilter) {
            return (0, filter_1.checkFilterContains)(entity, context, groupFilter, filter, true);
        }
        return false;
    }
    checkSelection(entity, selection, context) {
        const leafSelections = this.destructSelection(entity, selection);
        const deducedLeafSelections = leafSelections.map(({ entity, filter }) => this.getDeducedEntityFilters(entity, filter, ['select'], context));
        const checkDeducedLeafSelections = (dlSelections2) => {
            const dlSelections = dlSelections2.filter((ele) => {
                const entities = ele.map(ele2 => ele2.entity);
                // 同一个leaf的deducedSelections中只要有一个能通过就足够了
                if ((0, lodash_1.intersection)(this.selectFreeEntities, entities).length > 0) {
                    return false;
                }
                if ((0, lodash_1.intersection)(RelationAuth.SPECIAL_ENTITIES, entities).length > 0) {
                    // todo 
                    return false;
                }
                return true;
            });
            if (dlSelections.length === 0) {
                return true;
            }
            if (!context.getCurrentUserId()) {
                throw new types_1.OakUnloggedInException();
            }
            const allEntities = [];
            dlSelections.forEach((ele) => ele.forEach(({ entity }) => {
                allEntities.push(entity);
            }));
            const actionAuths = context.select('actionAuth', {
                data: {
                    id: 1,
                    paths: 1,
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
                        $in: allEntities,
                    },
                    $or: [
                        {
                            relation: {
                                userRelation$relation: {
                                    userId: context.getCurrentUserId(),
                                },
                            }
                        },
                        {
                            relationId: {
                                $exists: false,
                            },
                        }
                    ]
                }
            }, { dontCollect: true, ignoreAttrMiss: true });
            /**
             * 返回的结果中，第一层为leafNode，必须全通过，第二层为单个leafNode上的deduce，通过一个就可以
             * @param result
             * @returns
             */
            const checkResult = (result) => {
                let idx = 0;
                for (const r1 of result) {
                    const r2 = r1.find(ele => ele === true);
                    if (!r2) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('对象的select权限被否决，请检查', dlSelections[idx]);
                        }
                        return false;
                    }
                }
                return true;
            };
            if (actionAuths instanceof Promise) {
                (0, assert_1.default)(context instanceof AsyncRowStore_1.AsyncContext);
                return actionAuths.then((aas) => Promise.all(dlSelections.map((ele) => Promise.all(ele.map((ele2) => this.checkActionAuthInGroup(ele2.entity, ele2.filter, aas, context))))).then((result) => checkResult(result)));
            }
            return checkResult(dlSelections.map(ele => ele.map(ele2 => this.checkActionAuthInGroup(ele2.entity, ele2.filter, actionAuths, context))));
        };
        if (deducedLeafSelections[0] instanceof Promise) {
            return Promise.all(deducedLeafSelections)
                .then((dls) => checkDeducedLeafSelections(dls));
        }
        return checkDeducedLeafSelections(deducedLeafSelections);
    }
    /**
     * 此函数判定一个结点是否能通过权限检测，同时寻找该结点本身对象上成立的actionAuth，用于本结点子孙结点的快速检测
     * 如果结点因其deduce的对象通过了检测，其被推断对象的actionAuth无法用于更低对象的权限检测
     * @param node
     * @param context
     * @returns
     */
    findActionAuthsOnNode(node, context) {
        const { entity, filter, action, userRelations } = node;
        const deducedEntityFilters2 = this.getDeducedEntityFilters(entity, filter, [action], context);
        /**
         * 搜索判定是否允许自建对象，自建的条件是 path = ''，destEntity === entity
         * @param actionAuths
         * @returns
         */
        const findOwnCreateUserRelation = (actionAuths) => {
            if (userRelations && userRelations.length > 0) {
                const ars = actionAuths.filter((ar) => !!userRelations.find((ur) => ur.relationId === ar.relationId) && ar.paths.includes('') && ar.destEntity === entity);
                if (ars.length > 0) {
                    return ars;
                }
            }
        };
        const actionAuthOnEntities = [];
        const dealWithDeducedEntityFilters = (deducedEntityFilters) => {
            const specialEntities = deducedEntityFilters.filter(ele => RelationAuth.SPECIAL_ENTITIES.includes(ele.entity));
            const unspecicalEntities = deducedEntityFilters.filter(ele => !RelationAuth.SPECIAL_ENTITIES.includes(ele.entity));
            const result = [];
            if (specialEntities.length > 0) {
                // 对于deduce出来的special对象，直接判定create应该问题不大，否则写起来太烦琐（具体情况遇到了再调试）
                result.push(...specialEntities.map(ele => this.checkOperateSpecialEntities2(ele.entity, ele.entity === entity ? node.action : 'create', ele.filter, context)));
            }
            if (unspecicalEntities.length > 0) {
                const allEntities = unspecicalEntities.map(ele => ele.entity);
                const allActions = (0, lodash_1.uniq)(unspecicalEntities.map(ele => ele.actions).flat());
                const actionAuths2 = context.select('actionAuth', {
                    data: {
                        id: 1,
                        paths: 1,
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
                            $in: allEntities,
                        },
                        deActions: {
                            $overlaps: allActions,
                        },
                    }
                }, { dontCollect: true, ignoreAttrMiss: true });
                const checkActionAuths = (actionAuths) => {
                    const created = findOwnCreateUserRelation(actionAuths);
                    if (created) {
                        actionAuthOnEntities.push(...created);
                        return true;
                    }
                    const result = deducedEntityFilters.map((ele) => {
                        const ars2 = actionAuths.filter(ele2 => ele2.destEntity === ele.entity && (0, lodash_1.intersection)(ele2.deActions, ele.actions).length > 0 // 这里只要overlap就可以了
                        );
                        const ars3 = this.filterActionAuths(ele.entity, ele.filter, ars2, context);
                        const checkFilteredArs = (actionAuths2) => {
                            if (actionAuths2.length > 0) {
                                if (ele.entity === entity) {
                                    actionAuthOnEntities.push(...actionAuths2);
                                }
                                return true;
                            }
                            return false;
                        };
                        if (ars3 instanceof Promise) {
                            return ars3.then((ars4) => checkFilteredArs(ars4));
                        }
                        return checkFilteredArs(ars3);
                    });
                    if (result.find(ele => ele instanceof Promise)) {
                        return Promise.all(result).then((r2) => r2.includes(true));
                    }
                    return result.includes(true);
                };
                if (actionAuths2 instanceof Promise) {
                    result.push(actionAuths2.then((ars2) => checkActionAuths(ars2)));
                }
                else {
                    result.push(checkActionAuths(actionAuths2));
                }
            }
            if (result.find(ele => ele instanceof Promise)) {
                return Promise.all(result).then((r2) => {
                    // r2中只有一个通过就能通过
                    if (r2.includes(true)) {
                        return actionAuthOnEntities;
                    }
                    return false;
                });
            }
            if (result.includes(true)) {
                return actionAuthOnEntities;
            }
            return false;
        };
        if (deducedEntityFilters2 instanceof Promise) {
            return deducedEntityFilters2.then((def2) => dealWithDeducedEntityFilters(def2));
        }
        return dealWithDeducedEntityFilters(deducedEntityFilters2);
    }
    checkOperationTree2(tree, context) {
        const checkNode = (node, actionAuths) => {
            const checkChildren = (legalPaths) => {
                const { children } = node;
                const childPath = Object.keys(children);
                if (childPath.length === 0) {
                    return true;
                }
                const childResult = childPath.map((childPath) => {
                    const child = children[childPath];
                    const childEntity = child instanceof Array ? child[0].entity : child.entity;
                    // 这里如果该子结点能deduce到父，则直接通过
                    if (this.authDeduceRelationMap[childEntity]) {
                        (0, assert_1.default)(this.authDeduceRelationMap[childEntity] === 'entity');
                        const rel = (0, relation_1.judgeRelation)(this.schema, childEntity, childPath);
                        if (rel === 2) {
                            return true;
                        }
                    }
                    const pathToParent = childPath.endsWith('$entity') ? node.entity : childPath.split('$')[1];
                    if (child instanceof Array) {
                        const childActions = child.map(ele => ele.action);
                        const childLegalAuths = legalPaths.map((ele) => {
                            const { paths, relationId } = ele;
                            const paths2 = paths.map((path) => path ? `${pathToParent}.${path}` : pathToParent);
                            return context.select('actionAuth', {
                                data: {
                                    id: 1,
                                },
                                filter: {
                                    paths: {
                                        $overlaps: paths2,
                                    },
                                    destEntity: childEntity,
                                    deActions: {
                                        $overlaps: childActions,
                                    },
                                    relationId: relationId || {
                                        $exists: false,
                                    },
                                }
                            }, { dontCollect: true });
                        }).flat();
                        if (childLegalAuths[0] instanceof Promise) {
                            return Promise.all(childLegalAuths).then((clas) => child.map((c) => checkNode(c, clas)));
                        }
                        return child.map((c) => checkNode(c, childLegalAuths));
                    }
                    const childLegalAuths = legalPaths.map((ele) => {
                        const { paths, relationId } = ele;
                        const paths2 = paths.map((path) => path ? `${pathToParent}.${path}` : pathToParent);
                        return context.select('actionAuth', {
                            data: {
                                id: 1,
                            },
                            filter: {
                                paths: {
                                    $overlaps: paths2,
                                },
                                destEntity: childEntity,
                                deActions: {
                                    $overlaps: child.action,
                                },
                                relationId: relationId || {
                                    $exists: false,
                                },
                            }
                        }, { dontCollect: true });
                    }).flat();
                    if (childLegalAuths[0] instanceof Promise) {
                        return Promise.all(childLegalAuths).then((clas) => checkNode(child, clas.flat()));
                    }
                    return checkNode(child, childLegalAuths);
                }).flat();
                if (childResult[0] instanceof Promise) {
                    return Promise.all(childResult).then((r) => !r.includes(false));
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
            const checkResult = (result2) => {
                if (result2 === false) {
                    return false;
                }
                // 如果是对user对象操作通过，需要增添一条虚假的的actionAuth
                if (node.entity === 'user') {
                    result2.push({
                        id: 'temp',
                        paths: [''],
                        $$createAt$$: 1,
                        $$updateAt$$: 1,
                        $$seq$$: 'temp',
                        destEntity: 'user',
                        deActions: [node.action],
                    });
                }
                return checkChildren(result2);
            };
            if (result instanceof Promise) {
                return result.then((r2) => checkResult(r2));
            }
            return checkResult(result);
        };
        return checkNode(tree);
    }
    /* private checkOperationTree<Cxt extends AsyncContext<ED> | SyncContext<ED>>(tree: OperationTree<ED>, context: Cxt) {
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
                                        const { paths, relationId } = ele;
                                        const paths2 = paths.map(
                                            (path) => path ? `${pathToParent}.${path}` : pathToParent
                                        );
                                        return context.select('actionAuth', {
                                            data: {
                                                id: 1,
                                            },
                                            filter: {
                                                paths: {
                                                    $overlaps: paths2,
                                                },
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
                                    const { paths, relationId } = ele;
                                    const paths2 = paths.map(
                                        (path) => path ? `${pathToParent}.${path}` : pathToParent
                                    );
                                    return context.select('actionAuth', {
                                        data: {
                                            id: 1,
                                        },
                                        filter: {
                                            paths: {
                                                $overlaps: paths2,
                                            },
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
                        if (node.entity === 'user') {
                            // 如果当前是对user对象操作，需要加上一个指向它自身的actionAuth，否则剩下的子对象会判定不过
                            // user的操作权限由应用自己决定，如果user的操作最终过不去，这里放过也没关系
                            assert(node === tree && realLegalPaths.length === 0);  // user不可能是非根结点
                            realLegalPaths.push({
                                id: 'temp',
                                paths: [''],
                                $$createAt$$: 1,
                                $$updateAt$$: 1,
                                $$seq$$: 'temp',
                                destEntity: 'user',
                                deActions: [node.action],
                            });
                        }
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
    } */
    checkOperation(entity, operation, context) {
        const { action, filter, data } = operation;
        if (action === 'create' && this.createFreeEntities.includes(entity)) {
            return true;
        }
        else if (action === 'update' && this.updateFreeEntities.includes(entity)) {
            return true;
        }
        const userId = context.getCurrentUserId();
        if (!userId) {
            throw new types_1.OakUnloggedInException();
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
    checkActions2(entity, operation, context, actions) {
        const { action } = operation;
        if (!action || action_1.readOnlyActions.includes(action)) {
            const result = this.checkSelection(entity, operation, context);
            if (result instanceof Promise) {
                return result.then((r) => {
                    if (!r) {
                        throw new types_1.OakUserInvisibleException();
                    }
                });
            }
            if (!result) {
                throw new types_1.OakUserInvisibleException();
            }
        }
        else {
            const result = this.checkOperation(entity, operation, context);
            if (result instanceof Promise) {
                return result.then((r) => {
                    if (!r) {
                        throw new types_1.OakUserUnpermittedException();
                    }
                });
            }
            if (!result) {
                throw new types_1.OakUserUnpermittedException();
            }
        }
    }
}
exports.RelationAuth = RelationAuth;
;
/**
 * 获取有对entity进行actions操作权限的userRelation关系
 * @param params
 * @param context
 * todo paths改成复数以后这里还未充分测试过
 */
async function getUserRelationsByActions(params, context) {
    const { entity, filter, actions, overlap } = params;
    const actionAuthfilter = {
        destEntity: entity,
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
            paths: 1,
            relationId: 1,
            relation: {
                id: 1,
                entity: 1,
            },
        },
        filter: actionAuthfilter,
    }, { dontCollect: true });
    const getUserRelations = async (urAuths) => {
        const makeRelationIterator = (path, relationIds) => {
            if (path === '') {
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
                        },
                    },
                    getData: (d) => {
                        return d.userRelation$entity;
                    },
                };
            }
            const paths = path.split('.');
            const makeIter = (e, idx) => {
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
                            }
                        },
                        getData: (d) => {
                            return d.userRelation$entity;
                        },
                    };
                }
                const attr = paths[idx];
                const rel = (0, relation_1.judgeRelation)(context.getSchema(), e, attr);
                if (rel === 2) {
                    const { projection, getData } = makeIter(attr, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]),
                    };
                }
                else if (typeof rel === 'string') {
                    const { projection, getData } = makeIter(rel, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]),
                    };
                }
                else {
                    (0, assert_1.default)(rel instanceof Array);
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
                        getData: (d) => d[attr] && d[attr].map((ele) => getData(ele)),
                    };
                }
            };
            return makeIter(entity, 0);
        };
        // 相同的path可以groupBy掉
        const urAuthDict2 = {};
        urAuths.forEach((auth) => {
            const { paths, relationId } = auth;
            paths.forEach((path) => {
                if (!urAuthDict2[path]) {
                    urAuthDict2[path] = [relationId];
                }
                else if (!urAuthDict2[path].includes(relationId)) {
                    urAuthDict2[path].push(relationId);
                }
            });
        });
        const userRelations = await Promise.all(Object.keys(urAuthDict2).map(async (path) => {
            const relationIds = urAuthDict2[path];
            const { projection, getData } = makeRelationIterator(path, relationIds);
            const rows = await context.select(entity, {
                data: projection,
                filter,
            }, { dontCollect: true });
            const urs = rows.map(ele => getData(ele)).flat().filter(ele => !!ele);
            return urs;
        }));
        return userRelations.flat();
    };
    const getDirectUserEntities = async (directAuths) => {
        const makeRelationIterator = (path) => {
            const paths = path.split('.');
            const makeIter = (e, idx) => {
                const attr = paths[idx];
                const rel = (0, relation_1.judgeRelation)(context.getSchema(), e, attr);
                if (idx === paths.length - 1) {
                    if (rel === 2) {
                        (0, assert_1.default)(attr === 'user');
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
                        (0, assert_1.default)(rel === 'user');
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
                                    };
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
                        getData: (d) => d[attr] && getData(d[attr]),
                    };
                }
                else if (typeof rel === 'string') {
                    const { projection, getData } = makeIter(rel, idx + 1);
                    return {
                        projection: {
                            id: 1,
                            [attr]: projection,
                        },
                        getData: (d) => d[attr] && getData(d[attr]),
                    };
                }
                else {
                    (0, assert_1.default)(rel instanceof Array);
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
                        getData: (d) => d[attr] && d[attr].map((ele) => getData(ele)),
                    };
                }
            };
            return makeIter(entity, 0);
        };
        const userEntities = await Promise.all(directAuths.map(async ({ paths }) => {
            return paths.map(async (path) => {
                const { getData, projection } = makeRelationIterator(path);
                const rows = await context.select(entity, {
                    data: projection,
                    filter,
                }, { dontCollect: true });
                const userEntities = rows.map(ele => getData(ele)).flat().filter(ele => !!ele);
                return userEntities;
            });
        }));
        return userEntities.flat();
    };
    const urAuths2 = actionAuths.filter(ele => !!ele.relationId // 有relation说明通过userRelation关联
    );
    const directAuths2 = actionAuths.filter(ele => !ele.relationId // 没relation说明通过user关联
    );
    const [userRelations, userEntities] = await Promise.all([getUserRelations(urAuths2), getDirectUserEntities(directAuths2)]);
    return {
        userRelations,
        userEntities,
    };
}
exports.getUserRelationsByActions = getUserRelationsByActions;
