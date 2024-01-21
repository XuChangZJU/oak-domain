"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeStore = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const Entity_1 = require("../types/Entity");
const RowStore_1 = require("../types/RowStore");
const filter_1 = require("./filter");
const relation_1 = require("./relation");
const types_1 = require("../types");
const lodash_1 = require("../utils/lodash");
const AsyncRowStore_1 = require("./AsyncRowStore");
const filter_2 = require("./filter");
const uuid_1 = require("../utils/uuid");
const entities_1 = require("../compiler/entities");
/**这个用来处理级联的select和update，对不同能力的 */
class CascadeStore extends RowStore_1.RowStore {
    constructor(storageSchema) {
        super(storageSchema);
    }
    selectionRewriters = [];
    operationRewriters = [];
    async reinforceSelectionAsync(entity, selection, context, option, isAggr) {
        if (!isAggr && !selection.distinct) {
            this.reinforceSelectionInner(entity, selection, context);
        }
        const rewriterPromises = this.selectionRewriters.map(ele => ele(this.getSchema(), entity, selection, context, option, isAggr));
        if (rewriterPromises.length > 0) {
            await Promise.all(rewriterPromises);
        }
    }
    reinforceSelectionSync(entity, selection, context, option, isAggr) {
        if (!isAggr && !selection.distinct) {
            this.reinforceSelectionInner(entity, selection, context);
        }
        this.selectionRewriters.forEach(ele => {
            const result = ele(this.getSchema(), entity, selection, context, option);
            (0, assert_1.default)(!(result instanceof Promise));
        });
    }
    reinforceSelectionInner(entity, selection, context) {
        const { filter, data, sorter } = selection;
        const assignNecessaryProjectionAttrs = (projectionNode, attrs) => {
            attrs.forEach((attr) => {
                if (!projectionNode.hasOwnProperty(attr)) {
                    Object.assign(projectionNode, {
                        [attr]: 1,
                    });
                }
            });
        };
        const checkFilterNode = (entity2, filterNode, projectionNode, toBeAssignNode, filterNodeDict) => {
            const necessaryAttrs = ['id'];
            for (const attr in filterNode) {
                if (attr === '#id') {
                    (0, assert_1.default)(!filterNodeDict[filterNode[attr]], `projection中结点的id有重复, ${filterNode[attr]}`);
                    Object.assign(filterNodeDict, {
                        [filterNode[attr]]: projectionNode,
                    });
                    if (toBeAssignNode[filterNode[attr]]) {
                        assignNecessaryProjectionAttrs(projectionNode, toBeAssignNode[filterNode[attr]]);
                    }
                }
                else if (['$and', '$or'].includes(attr)) {
                    for (const node of filterNode[attr]) {
                        checkFilterNode(entity2, node, projectionNode, toBeAssignNode, filterNodeDict);
                    }
                }
                else if (attr === '$not') {
                    checkFilterNode(entity2, filterNode[attr], projectionNode, toBeAssignNode, filterNodeDict);
                }
                else if (attr === '$text') {
                    // 全文检索首先要有fulltext索引，其次要把fulltext的相关属性加到projection里
                    const { indexes } = this.getSchema()[entity2];
                    const fulltextIndex = indexes.find(ele => ele.config && ele.config.type === 'fulltext');
                    const { attributes } = fulltextIndex;
                    necessaryAttrs.push(...(attributes.map(ele => ele.name)));
                }
                else {
                    if (attr.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
                        const exprResult = (0, types_1.getAttrRefInExpression)(filterNode[attr]);
                        for (const nodeName in exprResult) {
                            if (nodeName === '#current') {
                                assignNecessaryProjectionAttrs(projectionNode, exprResult[nodeName]);
                            }
                            else if (filterNodeDict[nodeName]) {
                                assignNecessaryProjectionAttrs(filterNodeDict[nodeName], exprResult[nodeName]);
                            }
                            else {
                                if (toBeAssignNode[nodeName]) {
                                    toBeAssignNode[nodeName].push(...exprResult[nodeName]);
                                }
                                else {
                                    Object.assign(toBeAssignNode, {
                                        [nodeName]: exprResult[nodeName],
                                    });
                                }
                            }
                        }
                    }
                    else {
                        const rel = this.judgeRelation(entity2, attr);
                        if (rel === 1) {
                            necessaryAttrs.push(attr);
                        }
                        else if (rel === 2) {
                            // entity/entityId反指
                            necessaryAttrs.push('entity', 'entityId');
                            if (!projectionNode[attr]) {
                                Object.assign(projectionNode, {
                                    [attr]: {
                                        id: 1,
                                    }
                                });
                            }
                            checkFilterNode(attr, filterNode[attr], projectionNode[attr], toBeAssignNode, filterNodeDict);
                        }
                        else if (typeof rel === 'string') {
                            necessaryAttrs.push(`${attr}Id`);
                            if (!projectionNode[attr]) {
                                Object.assign(projectionNode, {
                                    [attr]: {
                                        id: 1,
                                    }
                                });
                            }
                            checkFilterNode(rel, filterNode[attr], projectionNode[attr], toBeAssignNode, filterNodeDict);
                        }
                        else if (rel instanceof Array) {
                            // 子查询，暂时不处理
                        }
                    }
                }
                assignNecessaryProjectionAttrs(projectionNode, necessaryAttrs);
            }
        };
        const checkSorterNode = (entity2, sorterNode, projectionNode) => {
            const checkSortAttr = (e2, sortAttr, projNode) => {
                const necessaryAttrs = [];
                for (const attr in sortAttr) {
                    const rel = this.judgeRelation(e2, attr);
                    if (typeof rel === 'number' && [0, 1].includes(rel)) {
                        necessaryAttrs.push(attr);
                    }
                    else if (typeof rel === 'string') {
                        if (!projNode[attr]) {
                            Object.assign(projNode, {
                                [attr]: {},
                            });
                        }
                        (0, assert_1.default)(typeof sortAttr[attr] === 'object');
                        checkSortAttr(rel, sortAttr[attr], projNode[attr]);
                    }
                    else {
                        (0, assert_1.default)(rel === 2);
                        if (!projNode[attr]) {
                            Object.assign(projNode, {
                                [attr]: {},
                            });
                        }
                        (0, assert_1.default)(typeof sortAttr[attr] === 'object');
                        checkSortAttr(attr, sortAttr[attr], projNode[attr]);
                    }
                }
            };
            sorterNode.forEach((node) => {
                const { $attr } = node;
                checkSortAttr(entity2, $attr, projectionNode);
            });
        };
        let relevantIds = [];
        if (filter) {
            const toBeAssignNode = {}; // 用来记录在表达式中涉及到的结点
            // filter当中所关联到的属性必须在projection中
            const filterNodeDict = {};
            checkFilterNode(entity, filter, data, toBeAssignNode, filterNodeDict);
            relevantIds = (0, filter_2.getRelevantIds)(filter);
        }
        // sorter也得取了，前端需要处理排序
        if (sorter) {
            checkSorterNode(entity, sorter, data);
        }
        const toBeAssignNode2 = {}; // 用来记录在表达式中涉及到的结点
        const projectionNodeDict = {};
        const checkProjectionNode = (entity2, projectionNode) => {
            const necessaryAttrs = ['id', '$$createAt$$', '$$updateAt$$']; // 有的页面依赖于其它页面取数据，有时两个页面的filter的差异会导致有一个加createAt，有一个不加，此时可能产生前台取数据不完整的异常。先统一加上
            for (const attr in projectionNode) {
                if (attr === '#id') {
                    (0, assert_1.default)(!projectionNodeDict[projectionNode[attr]], `projection中结点的id有重复, ${projectionNode[attr]}`);
                    Object.assign(projectionNodeDict, {
                        [projectionNode[attr]]: projectionNode,
                    });
                    if (toBeAssignNode2[projectionNode[attr]]) {
                        assignNecessaryProjectionAttrs(projectionNode, toBeAssignNode2[projectionNode[attr]]);
                    }
                }
                else {
                    if (attr.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
                        const exprResult = (0, types_1.getAttrRefInExpression)(projectionNode[attr]);
                        for (const nodeName in exprResult) {
                            if (nodeName === '#current') {
                                assignNecessaryProjectionAttrs(projectionNode, exprResult[nodeName]);
                            }
                            else if (projectionNodeDict[nodeName]) {
                                assignNecessaryProjectionAttrs(projectionNodeDict[nodeName], exprResult[nodeName]);
                            }
                            else {
                                if (toBeAssignNode2[nodeName]) {
                                    toBeAssignNode2[nodeName].push(...exprResult[nodeName]);
                                }
                                else {
                                    Object.assign(toBeAssignNode2, {
                                        [nodeName]: exprResult[nodeName],
                                    });
                                }
                            }
                        }
                    }
                    else {
                        const rel = (0, relation_1.judgeRelation)(this.getSchema(), entity2, attr);
                        if (rel === 1) {
                            necessaryAttrs.push(attr);
                        }
                        else if (rel === 2) {
                            // entity/entityId反指
                            necessaryAttrs.push('entity', 'entityId');
                            checkProjectionNode(attr, projectionNode[attr]);
                        }
                        else if (typeof rel === 'string') {
                            necessaryAttrs.push(`${attr}Id`);
                            checkProjectionNode(rel, projectionNode[attr]);
                        }
                        else if (rel instanceof Array && !attr.endsWith('$$aggr')) {
                            const { data, filter } = projectionNode[attr];
                            if (rel[1]) {
                                assignNecessaryProjectionAttrs(data, [rel[1]]);
                            }
                            else {
                                assignNecessaryProjectionAttrs(data, ['entity', 'entityId']);
                            }
                            this.reinforceSelectionInner(rel[0], projectionNode[attr], context);
                        }
                    }
                }
                assignNecessaryProjectionAttrs(projectionNode, necessaryAttrs);
            }
            // 如果对象中指向一对多的Modi，此时加上指向Modi的projection
            if (this.getSchema()[entity2].toModi) {
                Object.assign(projectionNode, {
                    modi$entity: {
                        $entity: 'modi',
                        data: {
                            id: 1,
                            targetEntity: 1,
                            entity: 1,
                            entityId: 1,
                            action: 1,
                            iState: 1,
                            data: 1,
                            filter: 1,
                            $$createAt$$: 1,
                            $$updateAt$$: 1,
                        },
                        filter: {
                            iState: 'active',
                        },
                    }
                });
            }
            // 如果对象上有relation关系，在此将本用户相关的relation和actionAuth全部取出
            // 还要将actionAuth上没有relation关系但destEntity为本对象的行也全部取出，这些是指向userId的可能路径
            // 放在这里有点怪异，暂先这样
            if (context instanceof AsyncRowStore_1.AsyncContext) {
                const userId = context.getCurrentUserId(true);
                if (userId && !entities_1.SYSTEM_RESERVE_ENTITIES.includes(entity2)) {
                    if (this.getSchema()[entity2].relation && !projectionNode.userRelation$entity) {
                        Object.assign(projectionNode, {
                            userRelation$entity: {
                                $entity: 'userRelation',
                                data: {
                                    id: 1,
                                    entity: 1,
                                    entityId: 1,
                                    userId: 1,
                                    relationId: 1,
                                    relation: {
                                        id: 1,
                                        name: 1,
                                        display: 1,
                                    }
                                },
                                filter: {
                                    userId,
                                },
                            },
                        });
                    }
                }
            }
        };
        checkProjectionNode(entity, data);
        if (!sorter && relevantIds.length === 0) {
            // 如果没有sorter，就给予一个按createAt逆序的sorter
            Object.assign(selection, {
                sorter: [
                    {
                        $attr: {
                            $$createAt$$: 1,
                        },
                        $direction: 'desc',
                    }
                ]
            });
            Object.assign(data, {
                $$createAt$$: 1,
            });
        }
    }
    async reinforceOperation(entity, operation, context, option) {
        await Promise.all(this.operationRewriters.map(ele => ele(this.getSchema(), entity, operation, context, option)));
    }
    registerOperationRewriter(rewriter) {
        this.operationRewriters.push(rewriter);
    }
    registerSelectionRewriter(rewriter) {
        this.selectionRewriters.push(rewriter);
    }
    destructCascadeSelect(entity, projection2, context, cascadeSelectFn, aggregateFn, option) {
        const cascadeSelectionFns = [];
        const supportMtoJoin = this.supportManyToOneJoin();
        const { toModi } = this.getSchema()[entity];
        (0, assert_1.default)(typeof projection2 === 'object');
        for (const attr in projection2) {
            const relation = (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
            }
            else if (relation === 2) {
                // 基于entity/entityId的多对一
                (0, assert_1.default)(typeof projection2[attr] === 'object');
                if (supportMtoJoin) {
                    cascadeSelectionFns.push((result) => {
                        if (!toModi) {
                            result.forEach((ele) => {
                                if (ele.entity === attr) {
                                    (0, assert_1.default)(ele.entityId);
                                    if (!ele[attr]) {
                                        throw new types_1.OakRowUnexistedException([{
                                                entity: attr,
                                                selection: {
                                                    data: projection2[attr],
                                                    filter: {
                                                        id: ele.entityId,
                                                    }
                                                }
                                            }]);
                                    }
                                }
                            });
                        }
                    });
                    const { projection: subProjection, cascadeSelectionFns: subCascadeSelectionFns, } = this.destructCascadeSelect(attr, projection2[attr], context, cascadeSelectFn, aggregateFn, option);
                    subCascadeSelectionFns.forEach(ele => cascadeSelectionFns.push((result) => {
                        return ele(result.map(ele2 => ele2[attr]).filter(ele2 => !!ele2));
                    }));
                }
                else {
                    cascadeSelectionFns.push((result) => {
                        const entityIds = (0, lodash_1.uniq)(result.filter(ele => ele.entity === attr).map(ele => {
                            (0, assert_1.default)(ele.entityId !== null);
                            return ele.entityId;
                        }));
                        const dealWithSubRows = (subRows) => {
                            (0, assert_1.default)(subRows.length <= entityIds.length);
                            if (subRows.length < entityIds.length && !toModi) {
                                // 后台不允许数据不一致
                                if (context instanceof AsyncRowStore_1.AsyncContext || !option.ignoreAttrMiss) {
                                    throw new types_1.OakRowUnexistedException([{
                                            entity: attr,
                                            selection: {
                                                data: projection2[attr],
                                                filter: {
                                                    id: {
                                                        $in: entityIds
                                                    },
                                                },
                                            },
                                        }]);
                                }
                            }
                            result.forEach((ele) => {
                                if (ele.entity === attr) {
                                    const subRow = subRows.find(ele2 => ele2.id === ele.entityId);
                                    if (subRow) {
                                        Object.assign(ele, {
                                            [attr]: subRow,
                                        });
                                    }
                                    else {
                                        Object.assign(ele, {
                                            [attr]: null,
                                        });
                                    }
                                }
                            });
                        };
                        if (entityIds.length > 0) {
                            const subRows = cascadeSelectFn.call(this, attr, {
                                data: projection2[attr],
                                filter: {
                                    id: {
                                        $in: entityIds
                                    },
                                },
                            }, context, option);
                            if (subRows instanceof Promise) {
                                return subRows.then((subRowss) => dealWithSubRows(subRowss));
                            }
                            else {
                                dealWithSubRows(subRows);
                            }
                        }
                    });
                }
            }
            else if (typeof relation === 'string') {
                (0, assert_1.default)(typeof projection2[attr] === 'object');
                if (supportMtoJoin) {
                    if (!toModi) {
                        // 如果不是modi，要保证外键没有空指针
                        cascadeSelectionFns.push((result) => {
                            if (!toModi) {
                                result.forEach((ele) => {
                                    if (ele[`${attr}Id`] && !ele[attr]) {
                                        throw new types_1.OakRowUnexistedException([{
                                                entity: relation,
                                                selection: {
                                                    data: projection2[attr],
                                                    filter: {
                                                        id: ele[`${attr}Id`],
                                                    }
                                                }
                                            }]);
                                    }
                                });
                            }
                        });
                    }
                    const { projection: subProjection, cascadeSelectionFns: subCascadeSelectionFns, } = this.destructCascadeSelect(relation, projection2[attr], context, cascadeSelectFn, aggregateFn, option);
                    subCascadeSelectionFns.forEach(ele => cascadeSelectionFns.push((result) => {
                        return ele(result.map(ele2 => ele2[attr]).filter(ele2 => !!ele2));
                    }));
                }
                else {
                    cascadeSelectionFns.push((result) => {
                        const ids = (0, lodash_1.uniq)(result.filter(ele => !!(ele[`${attr}Id`])).map(ele => ele[`${attr}Id`]));
                        const dealWithSubRows = (subRows) => {
                            (0, assert_1.default)(subRows.length <= ids.length);
                            if (subRows.length < ids.length && !toModi) {
                                if (context instanceof AsyncRowStore_1.AsyncContext || !option.ignoreAttrMiss) {
                                    throw new types_1.OakRowUnexistedException([{
                                            entity: relation,
                                            selection: {
                                                data: projection2[attr],
                                                filter: {
                                                    id: {
                                                        $in: ids
                                                    },
                                                },
                                            }
                                        }]);
                                }
                            }
                            result.forEach((ele) => {
                                if (ele[`${attr}Id`]) {
                                    const subRow = subRows.find(ele2 => ele2.id === ele[`${attr}Id`]);
                                    if (subRow) {
                                        Object.assign(ele, {
                                            [attr]: subRow,
                                        });
                                    }
                                    else {
                                        Object.assign(ele, {
                                            [attr]: null,
                                        });
                                    }
                                }
                                else {
                                    Object.assign(ele, {
                                        [attr]: null,
                                    });
                                }
                            });
                        };
                        if (ids.length > 0) {
                            const subRows = cascadeSelectFn.call(this, relation, {
                                data: projection2[attr],
                                filter: {
                                    id: {
                                        $in: ids
                                    },
                                },
                            }, context, option);
                            if (subRows instanceof Promise) {
                                return subRows.then((subRowss) => dealWithSubRows(subRowss));
                            }
                            dealWithSubRows(subRows);
                        }
                    });
                }
            }
            else {
                (0, assert_1.default)(relation instanceof Array);
                const { data: subProjection, filter: subFilter, indexFrom, count, sorter: subSorter, total, randomRange } = projection2[attr];
                const [entity2, foreignKey] = relation;
                const isAggr = attr.endsWith('$$aggr');
                const otmAggrFn = (result) => {
                    const aggrResults = result.map(async (row) => {
                        const filter2 = foreignKey ? (0, filter_1.combineFilters)(entity2, this.getSchema(), [{
                                [foreignKey]: row.id,
                            }, subFilter]) : (0, filter_1.combineFilters)(entity2, this.getSchema(), [{
                                entity,
                                entityId: row.id,
                            }, subFilter]);
                        const aggrResult = aggregateFn.call(this, entity2, {
                            data: subProjection,
                            filter: filter2,
                            sorter: subSorter,
                            indexFrom,
                            count
                        }, context, option);
                        (0, assert_1.default)(aggrResult instanceof Promise);
                        const aggrResultResult = await aggrResult;
                        return Object.assign(row, {
                            [attr]: aggrResultResult,
                        });
                    });
                    if (aggrResults.length > 0) {
                        return Promise.all(aggrResults).then(() => undefined);
                    }
                };
                /** 若一对多子查询没有indexFrom和count，可以优化成组查 */
                const otmGroupFn = (result) => {
                    const dealWithSubRows = (subRows) => {
                        // 这里如果result只有一行，则把返回结果直接置上，不对比外键值
                        // 这样做的原因是有的对象的filter会被改写掉（userId)，只能临时这样处理
                        // 看不懂了，应该不需要这个if了，不知道怎么重现测试 by Xc 20230906
                        if (result.length === 1) {
                            Object.assign(result[0], {
                                [attr]: subRows,
                            });
                        }
                        else {
                            result.forEach((ele) => {
                                const subRowss = subRows.filter((ele2) => {
                                    if (foreignKey) {
                                        return ele2[foreignKey] === ele.id;
                                    }
                                    return ele2.entityId === ele.id;
                                });
                                (0, assert_1.default)(subRowss);
                                Object.assign(ele, {
                                    [attr]: subRowss,
                                });
                            });
                        }
                    };
                    const ids = result.map(ele => ele.id);
                    if (ids.length > 0) {
                        const filter2 = foreignKey ? (0, filter_1.combineFilters)(entity2, this.getSchema(), [{
                                [foreignKey]: {
                                    $in: ids,
                                },
                            }, subFilter]) : (0, filter_1.combineFilters)(entity2, this.getSchema(), [{
                                entity,
                                entityId: {
                                    $in: ids,
                                },
                            }, subFilter]);
                        const subRows = cascadeSelectFn.call(this, entity2, {
                            data: subProjection,
                            filter: filter2,
                            sorter: subSorter,
                            total,
                        }, context, option);
                        if (subRows instanceof Promise) {
                            return subRows.then((subRowss) => dealWithSubRows(subRowss));
                        }
                        dealWithSubRows(subRows);
                    }
                };
                /** 若一对多子查询有indexFrom和count，只能单行去连接 */
                const otmSingleFn = (result) => {
                    const dealWithSubRows2 = (row, subRows) => {
                        Object.assign(row, {
                            [attr]: subRows,
                        });
                    };
                    if (result.length > 0) {
                        const getSubRows = result.map((row) => {
                            const filter2 = foreignKey ? (0, filter_1.combineFilters)(entity2, this.getSchema(), [{
                                    [foreignKey]: row.id,
                                }, subFilter]) : (0, filter_1.combineFilters)(entity2, this.getSchema(), [{
                                    entity,
                                    entityId: row.id,
                                }, subFilter]);
                            const subRows = cascadeSelectFn.call(this, entity2, {
                                data: subProjection,
                                filter: filter2,
                                sorter: subSorter,
                                indexFrom,
                                count,
                                total,
                                randomRange,
                            }, context, option);
                            if (subRows instanceof Promise) {
                                return subRows.then((subRowss) => dealWithSubRows2(row, subRowss));
                            }
                            return dealWithSubRows2(row, subRows);
                        });
                        if (getSubRows[0] instanceof Promise) {
                            return Promise.all(getSubRows).then(() => undefined);
                        }
                        return;
                    }
                };
                if (isAggr) {
                    (context instanceof AsyncRowStore_1.AsyncContext) && cascadeSelectionFns.push(result => otmAggrFn(result));
                }
                else {
                    cascadeSelectionFns.push((result) => {
                        if (typeof indexFrom === 'number') {
                            (0, assert_1.default)(typeof count === 'number' && count > 0);
                            return otmSingleFn(result);
                        }
                        return otmGroupFn(result);
                    });
                }
            }
        }
        return {
            projection: projection2,
            cascadeSelectionFns,
        };
    }
    /**
     * 级联更新
     * A --> B
        多对一：A CREATE／B CREATE，B data的主键赋到A的data上
            A CREATE／B UPDATE，B filter的主键来自A的data
            A UPDATE／B CREATE，B data的主键赋到A的data上
            A UPDATE／B UPDATE，B filter的主键来自A的row
            A UPDATE／B REMOVE，B filter的主键来自A的row
            A REMOVE／B UPDATE，B filter的主键来自A的row
            A REMOVE／B REMOVE，B filter的主键来自A的row

        一对多：A CREATE／B CREATE，A data上的主键赋到B的data上
            A CREATE／B UPDATE，A data上的主键赋到B的data上
            A UPDATE／B CREATE，A filter上的主键赋到B的data上（一定是带主键的filter）
            A UPDATE／B UPDATE，A filter上的主键赋到B的filter上（一定是带主键的filter）
            A UPDATE／B REMOVE，A filter上的主键赋到B的filter上（一定是带主键的filter）
            A REMOVE／B UPDATE，A filter上的主键赋到B的filter上（且B关于A的外键清空）
            A REMOVE／B REMOVE，A filter上的主键赋到B的filter上
     *
     * 延时更新，
     *  A（业务级别的申请对象） ---> B（业务级别需要更新的对象）
     * 两者必须通过entity/entityId关联
     * 此时需要把对B的更新记录成一条新插入的Modi对象，并将A上的entity/entityId指向该对象（新生成的Modi对象的id与此operation的id保持一致）
     * @param entity
     * @param action
     * @param data
     * @param context
     * @param option
     * @param result
     * @param filter
     * @returns
     */
    destructCascadeUpdate(entity, action, data, context, option, cascadeUpdate, filter) {
        const modiAttr = this.getSchema()[entity].toModi;
        const option2 = Object.assign({}, option);
        const opData = {};
        const beforeFns = [];
        const afterFns = [];
        if (modiAttr && action !== 'remove' && !option.dontCreateModi) {
            // create/update具有modi对象的对象，对其子对象的update行为全部是create modi对象（缓存动作）
            // delete此对象，所有的modi子对象应该通过触发器作废，这个目前先通过系统的trigger来实现
            (0, assert_1.default)(!option2.modiParentId && !option2.modiParentEntity);
            if (action === 'create') {
                option2.modiParentId = data.id;
                option2.modiParentEntity = entity;
            }
            else if (filter?.id && typeof filter.id === 'string') {
                // 如果是对toModi对象进行cascadeUpdate操作，必然带有id，如果没有则认为不是modi相关的操作
                // 批量通过或者拒绝applyment应该就会出现
                option2.modiParentId = filter.id;
                option2.modiParentEntity = entity;
            }
        }
        for (const attr in data) {
            const relation = (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
            if (relation === 1) {
                Object.assign(opData, {
                    [attr]: data[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity/entityId的many-to-one
                const operationMto = data[attr];
                const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                if (actionMto === 'create') {
                    Object.assign(opData, {
                        entityId: dataMto.id,
                        entity: attr,
                    });
                }
                else if (action === 'create') {
                    const { entityId: fkId, entity } = data;
                    (0, assert_1.default)(typeof fkId === 'string' || entity === attr);
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(filterMto.id === fkId);
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(attr, this.getSchema(), [{
                                    id: fkId,
                                }, filterMto]),
                        });
                    }
                }
                else {
                    // 剩下三种情况都是B中的filter的id来自A中row的entityId
                    (0, assert_1.default)(!data.hasOwnProperty('entityId') && !data.hasOwnProperty('entity'));
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(typeof filterMto.id === 'string');
                    }
                    else if (filter.entity === attr && filter.entityId) {
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(attr, this.getSchema(), [{
                                    id: filter.entityId,
                                }, filterMto]),
                        });
                    }
                    else if (filter[attr]) {
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(attr, this.getSchema(), [filter[attr], filterMto]),
                        });
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(attr, this.getSchema(), [{
                                    [`${entity}$entity`]: {
                                        filter,
                                    }
                                }, filterMto]),
                        });
                    }
                }
                beforeFns.push(() => cascadeUpdate.call(this, attr, operationMto, context, option2));
            }
            else if (typeof relation === 'string') {
                // 基于attr的外键的many-to-one
                const operationMto = data[attr];
                const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                if (actionMto === 'create') {
                    Object.assign(opData, {
                        [`${attr}Id`]: dataMto.id,
                    });
                }
                else if (action === 'create') {
                    const { [`${attr}Id`]: fkId } = data;
                    (0, assert_1.default)(typeof fkId === 'string');
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(filterMto.id === fkId);
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(relation, this.getSchema(), [filterMto, {
                                    id: fkId,
                                }]),
                        });
                    }
                }
                else {
                    (0, assert_1.default)(!data.hasOwnProperty(`${attr}Id`));
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(typeof filterMto.id === 'string');
                    }
                    else if (filter[`${attr}Id`]) {
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(relation, this.getSchema(), [filterMto, {
                                    id: filter[`${attr}Id`],
                                }]),
                        });
                    }
                    else if (filter[attr]) {
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(relation, this.getSchema(), [filterMto, filter[attr]]),
                        });
                    }
                    else {
                        // A中data的attrId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: (0, filter_1.combineFilters)(relation, this.getSchema(), [filterMto, {
                                    [`${entity}$${attr}`]: filter
                                }]),
                        });
                    }
                }
                beforeFns.push(() => cascadeUpdate.call(this, relation, operationMto, context, option2));
            }
            else {
                (0, assert_1.default)(relation instanceof Array);
                const [entityOtm, foreignKey] = relation;
                const otmOperations = data[attr];
                const dealWithOneToMany = (otm) => {
                    const { action: actionOtm, data: dataOtm, filter: filterOtm } = otm;
                    if (!foreignKey) {
                        // 基于entity/entityId的one-to-many
                        if (action === 'create') {
                            const { id } = data;
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => Object.assign(ele, {
                                    entity,
                                    entityId: id,
                                }));
                            }
                            else {
                                Object.assign(dataOtm, {
                                    entity,
                                    entityId: id,
                                });
                            }
                        }
                        else if (actionOtm === 'create') {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            // todo 这个假设对watcher等后台行为可能不成立，等遇到create/create一对多的case再完善
                            const { id } = filter;
                            (0, assert_1.default)(typeof id === 'string');
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => Object.assign(ele, {
                                    entity,
                                    entityId: id,
                                }));
                            }
                            else {
                                Object.assign(dataOtm, {
                                    entity,
                                    entityId: id,
                                });
                            }
                        }
                        else {
                            // 这里优化一下，如果filter上有id，直接更新成根据entityId来过滤                            
                            if (filter) {
                                if (filter.id && Object.keys(filter).length === 1) {
                                    Object.assign(otm, {
                                        filter: (0, filter_1.combineFilters)(entityOtm, this.getSchema(), [{
                                                entity,
                                                entityId: filter.id,
                                            }, filterOtm]),
                                    });
                                }
                                else {
                                    Object.assign(otm, {
                                        filter: (0, filter_1.combineFilters)(entityOtm, this.getSchema(), [{
                                                [entity]: filter,
                                            }, filterOtm]),
                                    });
                                }
                            }
                            else {
                                Object.assign(otm, {
                                    filter: (0, filter_1.combineFilters)(entityOtm, this.getSchema(), [{
                                            entity,
                                            entityId: {
                                                $exists: true,
                                            }
                                        }, filterOtm])
                                });
                            }
                            if (action === 'remove' && actionOtm === 'update') {
                                Object.assign(dataOtm, {
                                    entity: null,
                                    entityId: null,
                                });
                            }
                        }
                    }
                    else {
                        // 基于foreignKey的one-to-many
                        if (action === 'create') {
                            const { id } = data;
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => Object.assign(ele, {
                                    [foreignKey]: id,
                                }));
                            }
                            else {
                                Object.assign(dataOtm, {
                                    [foreignKey]: id,
                                });
                            }
                        }
                        else if (actionOtm === 'create') {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            // todo 这个假设在后台可能不成立，等遇到了再说
                            const { id } = filter;
                            (0, assert_1.default)(typeof id === 'string');
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => Object.assign(ele, {
                                    [foreignKey]: id,
                                }));
                            }
                            else {
                                Object.assign(dataOtm, {
                                    [foreignKey]: id,
                                });
                            }
                        }
                        else {
                            // 这里优化一下，如果filter上有id，直接更新成根据entityId来过滤
                            if (filter) {
                                if (filter.id && Object.keys(filter).length === 1) {
                                    Object.assign(otm, {
                                        filter: (0, filter_1.combineFilters)(entityOtm, this.getSchema(), [{
                                                [foreignKey]: filter.id,
                                            }, filterOtm]),
                                    });
                                }
                                else {
                                    Object.assign(otm, {
                                        filter: (0, filter_1.combineFilters)(entityOtm, this.getSchema(), [{
                                                [foreignKey.slice(0, foreignKey.length - 2)]: filter,
                                            }, filterOtm]),
                                    });
                                }
                            }
                            else {
                                Object.assign(otm, {
                                    filter: (0, filter_1.combineFilters)(entityOtm, this.getSchema(), [{
                                            [foreignKey]: {
                                                $exists: true,
                                            },
                                        }, filterOtm]),
                                });
                            }
                            if (action === 'remove' && actionOtm === 'update') {
                                Object.assign(dataOtm, {
                                    [foreignKey]: null,
                                });
                            }
                        }
                    }
                    // 一对多的依赖应该后建，否则中间会出现空指针，导致checker等出错
                    afterFns.push(() => cascadeUpdate.call(this, entityOtm, otm, context, option2));
                };
                if (otmOperations instanceof Array) {
                    for (const oper of otmOperations) {
                        dealWithOneToMany(oper);
                    }
                }
                else {
                    dealWithOneToMany(otmOperations);
                }
            }
        }
        return {
            data: opData,
            beforeFns,
            afterFns,
        };
    }
    // 对插入的数据，没有初始值的属性置null
    preProcessDataCreated(entity, data) {
        const now = Date.now();
        const { attributes } = this.getSchema()[entity];
        const processSingle = (data2) => {
            for (const key in attributes) {
                if (data2[key] === undefined) {
                    Object.assign(data2, {
                        [key]: null,
                    });
                }
            }
            Object.assign(data2, {
                [Entity_1.CreateAtAttribute]: now,
                [Entity_1.UpdateAtAttribute]: now,
                [Entity_1.DeleteAtAttribute]: null,
            });
        };
        if (data instanceof Array) {
            data.forEach(ele => processSingle(ele));
        }
        else {
            processSingle(data);
        }
    }
    // 对更新的数据，去掉所有的undefined属性
    preProcessDataUpdated(data) {
        const undefinedKeys = Object.keys(data).filter(ele => data[ele] === undefined);
        undefinedKeys.forEach(ele => (0, lodash_1.unset)(data, ele));
    }
    judgeRelation(entity, attr) {
        return (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
    }
    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    async doUpdateSingleRowAsync(entity, operation, context, option) {
        const { data, action, id: operId, filter } = operation;
        const now = Date.now();
        switch (action) {
            case 'create': {
                if (option.modiParentEntity && !['modi', 'modiEntity', 'oper', 'operEntity'].includes(entity)) {
                    // 变成对modi的插入
                    (0, assert_1.default)(option.modiParentId);
                    const modiCreate = {
                        id: 'dummy',
                        action: 'create',
                        data: {
                            id: operId,
                            targetEntity: entity,
                            action,
                            entity: option.modiParentEntity,
                            entityId: option.modiParentId,
                            filter: {
                                id: data.id, //这里记录这个filter是为了后面update的时候直接在其上面update，参见本函数后半段关于modiUpsert相关的优化
                            },
                            data,
                            iState: 'active',
                        },
                    };
                    const closeRootMode = context.openRootMode();
                    await this.cascadeUpdateAsync('modi', modiCreate, context, option);
                    closeRootMode();
                    return {
                        'modi': {
                            create: 1,
                        }
                    };
                }
                else {
                    this.preProcessDataCreated(entity, data);
                    let result = 0;
                    const createInner = async (operation2) => {
                        try {
                            await this.updateAbjointRowAsync(entity, operation2, context, option);
                        }
                        catch (e) {
                            /* 这段代码是处理插入时有重复的行，现在看有问题，等实际需求出现再写
                            if (e instanceof OakCongruentRowExists) {
                                if (option.allowExists) {
                                    // 如果允许存在，对已存在行进行update，剩下的行继续insert
                                    const congruentRow = e.getData() as ED[T]['OpSchema'];
                                    if (data instanceof Array) {
                                        const rest = data.filter(
                                            ele => ele.id !== congruentRow.id
                                        );
                                        if (rest.length === data.length) {
                                            throw e;
                                        }
                                        const result2 = await this.updateAbjointRow(
                                            entity,
                                            Object.assign({}, operation, {
                                                data: rest,
                                            }),
                                            context,
                                            option
                                        );
    
                                        const row = data.find(
                                            ele => ele.id === congruentRow.id
                                        );
                                        const updateData = omit(row, ['id', '$$createAt$$']);
                                        const result3 = await this.updateAbjointRow(
                                            entity,
                                            {
                                                id: await generateNewId(),
                                                action: 'update',
                                                data: updateData,
                                                filter: {
                                                    id: congruentRow.id,
                                                } as any,
                                            },
                                            context,
                                            option
                                        );
    
                                        return result2 + result3;
                                    }
                                    else {
                                        if (data.id !== congruentRow.id) {
                                            throw e;
                                        }
                                        const updateData = omit(data, ['id', '$$createAt$$']);
                                        const result2 = await this.updateAbjointRow(
                                            entity,
                                            {
                                                id: await generateNewId(),
                                                action: 'update',
                                                data: updateData,
                                                filter: {
                                                    id: congruentRow.id,
                                                } as any,
                                            },
                                            context,
                                            option
                                        );
                                        return result2;
                                    }
                                }
                            } */
                            throw e;
                        }
                    };
                    if (data instanceof Array) {
                        result = data.length;
                        const multipleCreate = this.supportMultipleCreate();
                        if (multipleCreate) {
                            await createInner(operation);
                        }
                        else {
                            for (const d of data) {
                                const createSingleOper = {
                                    id: 'any',
                                    action: 'create',
                                    data: d,
                                };
                                await createInner(createSingleOper);
                            }
                        }
                    }
                    else {
                        result = 1;
                        await createInner(operation);
                    }
                    if (!option.dontCollect) {
                        context.saveOpRecord(entity, operation);
                        /* context.opRecords.push({
                            a: 'c',
                            e: entity,
                            d: data as ED[T]['OpSchema'] | ED[T]['OpSchema'][],
                        }); */
                    }
                    if (!option.dontCreateOper && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity)) {
                        // 按照框架要求生成Oper和OperEntity这两个内置的对象
                        (0, assert_1.default)(operId);
                        const operatorId = context.getCurrentUserId(true);
                        if (operatorId) {
                            const createOper = {
                                id: 'dummy',
                                action: 'create',
                                data: {
                                    id: operId,
                                    action,
                                    data,
                                    operatorId,
                                    targetEntity: entity,
                                    operEntity$oper: data instanceof Array ? {
                                        id: 'dummy',
                                        action: 'create',
                                        data: await Promise.all(data.map(async (ele) => ({
                                            id: await (0, uuid_1.generateNewIdAsync)(),
                                            entityId: ele.id,
                                            entity: entity,
                                        }))),
                                    } : [{
                                            id: 'dummy',
                                            action: 'create',
                                            data: {
                                                id: await (0, uuid_1.generateNewIdAsync)(),
                                                entityId: data.id,
                                                entity: entity,
                                            },
                                        }]
                                },
                            };
                            const closeRootMode = context.openRootMode();
                            await this.cascadeUpdateAsync('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            });
                            closeRootMode();
                        }
                    }
                    return {
                        [entity]: {
                            ['create']: result,
                        }
                    };
                }
            }
            default: {
                // 这里要优化一下，显式的对id的update/remove不要去查了，节省数据库层的性能（如果这些row是建立在一个create的modi上也查不到）
                const ids = (0, filter_2.getRelevantIds)(filter);
                if (ids.length === 0) {
                    const selection = {
                        data: {
                            id: 1,
                        },
                        filter: operation.filter,
                        indexFrom: operation.indexFrom,
                        count: operation.count,
                    };
                    const rows = await this.selectAbjointRowAsync(entity, selection, context, {
                        dontCollect: true,
                    });
                    ids.push(...(rows.map(ele => ele.id)));
                }
                if (data) {
                    this.preProcessDataUpdated(data);
                }
                if (option.modiParentEntity && !['modi', 'modiEntity'].includes(entity)) {
                    // 延时更新，变成对modi的插入
                    // 变成对modi的插入
                    // 优化，这里如果是对同一个targetEntity反复update，则变成对最后一条create/update的modi进行update，以避免发布文章这样的需求时产生过多的modi
                    let modiUpsert;
                    if (action !== 'remove') {
                        const upsertModis = await this.selectAbjointRowAsync('modi', {
                            data: {
                                id: 1,
                                data: 1,
                            },
                            filter: {
                                targetEntity: entity,
                                action: {
                                    $in: ['create', 'update'],
                                },
                                entity: option.modiParentEntity,
                                entityId: option.modiParentId,
                                iState: 'active',
                                filter: ids.length > 0 ? {
                                    id: {
                                        $in: ids,
                                    },
                                } : filter,
                            },
                            sorter: [
                                {
                                    $attr: {
                                        $$createAt$$: 1,
                                    },
                                    $direction: 'desc',
                                }
                            ],
                            indexFrom: 0,
                            count: 1,
                        }, context, option);
                        if (upsertModis.length > 0) {
                            const { data: originData, id: originId } = upsertModis[0];
                            modiUpsert = {
                                id: 'dummy',
                                action: 'update',
                                data: {
                                    data: Object.assign({}, originData, data),
                                },
                                filter: {
                                    id: originId,
                                }
                            };
                        }
                    }
                    if (!modiUpsert) {
                        modiUpsert = {
                            id: 'dummy',
                            action: 'create',
                            data: {
                                id: operId,
                                targetEntity: entity,
                                entity: option.modiParentEntity,
                                entityId: option.modiParentId,
                                action,
                                data,
                                iState: 'active',
                                filter,
                            },
                        };
                        if (ids.length > 0) {
                            modiUpsert.data.modiEntity$modi = {
                                id: 'dummy',
                                action: 'create',
                                data: await Promise.all(ids.map(async (id) => ({
                                    id: await (0, uuid_1.generateNewIdAsync)(),
                                    entity: entity,
                                    entityId: id,
                                }))),
                            };
                        }
                    }
                    const closeRootMode = context.openRootMode();
                    await this.cascadeUpdateAsync('modi', modiUpsert, context, option);
                    closeRootMode();
                    return {
                        modi: {
                            ['create']: 1,
                        },
                    };
                }
                else {
                    const createOper = async () => {
                        if (!option?.dontCreateOper && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity) && ids.length > 0) {
                            // 按照框架要求生成Oper和OperEntity这两个内置的对象
                            (0, assert_1.default)(operId);
                            const createOper = {
                                id: 'dummy',
                                action: 'create',
                                data: {
                                    id: operId,
                                    action,
                                    data,
                                    targetEntity: entity,
                                    operEntity$oper: {
                                        id: 'dummy',
                                        action: 'create',
                                        data: await Promise.all(ids.map(async (ele) => ({
                                            id: await (0, uuid_1.generateNewIdAsync)(),
                                            entityId: ele,
                                            entity: entity,
                                        })))
                                    },
                                },
                            };
                            const closeRootMode = context.openRootMode();
                            await this.cascadeUpdateAsync('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            });
                            closeRootMode();
                        }
                    };
                    if (action === 'remove') {
                        if (!option.dontCollect) {
                            context.saveOpRecord(entity, {
                                id: operId,
                                action,
                                data: {},
                                filter: {
                                    id: {
                                        $in: ids,
                                    }
                                }
                            });
                            /* context.opRecords.push({
                                a: 'r',
                                e: entity,
                                f: {
                                    id: {
                                        $in: ids,
                                    }
                                },
                            }); */
                        }
                    }
                    else {
                        const updateAttrCount = Object.keys(data).length;
                        if (updateAttrCount > 0) {
                            // 优化一下，如果不更新任何属性，则不实际执行
                            Object.assign(data, {
                                $$updateAt$$: now,
                            });
                            if (!option.dontCollect) {
                                context.saveOpRecord(entity, {
                                    id: operId,
                                    action,
                                    data: data,
                                    filter: {
                                        id: {
                                            $in: ids,
                                        }
                                    },
                                });
                                /* context.opRecords.push({
                                    a: 'u',
                                    e: entity,
                                    d: data as ED[T]['Update']['data'],
                                    f: {
                                        id: {
                                            $in: ids,
                                        }
                                    },
                                }); */
                            }
                        }
                        else if (action !== 'update') {
                            // 如果不是update动作而是用户自定义的动作，这里还是要记录oper
                            await createOper();
                            return {};
                        }
                        else {
                            return {};
                        }
                    }
                    await this.updateAbjointRowAsync(entity, operation, context, option);
                    await createOper();
                    return {
                        [entity]: {
                            [action]: ids.length,
                        }
                    };
                }
            }
        }
    }
    doUpdateSingleRow(entity, operation, context, option) {
        const { data, action, id: operId, filter } = operation;
        const now = Date.now();
        switch (action) {
            case 'create': {
                this.preProcessDataCreated(entity, data);
                let result = 0;
                const createInner = (operation2) => {
                    try {
                        result += this.updateAbjointRow(entity, operation2, context, option);
                    }
                    catch (e) {
                        throw e;
                    }
                };
                if (data instanceof Array) {
                    const multipleCreate = this.supportMultipleCreate();
                    if (multipleCreate) {
                        createInner(operation);
                    }
                    else {
                        for (const d of data) {
                            const createSingleOper = {
                                id: 'any',
                                action: 'create',
                                data: d,
                            };
                            createInner(createSingleOper);
                        }
                    }
                }
                else {
                    createInner(operation);
                }
                return result;
            }
            default: {
                if (action === 'remove') {
                }
                else {
                    const updateAttrCount = Object.keys(data).length;
                    if (updateAttrCount > 0) {
                        // 优化一下，如果不更新任何属性，则不实际执行
                        Object.assign(data, {
                            $$updateAt$$: now,
                        });
                        this.preProcessDataUpdated(data);
                    }
                    else {
                        return 0;
                    }
                }
                return this.updateAbjointRow(entity, operation, context, option);
            }
        }
    }
    cascadeUpdate(entity, operation, context, option) {
        const { action, data, filter, id } = operation;
        let opData;
        const wholeBeforeFns = [];
        const wholeAfterFns = [];
        const result = {};
        if (['create', 'create-l'].includes(action) && data instanceof Array) {
            opData = [];
            for (const d of data) {
                const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(entity, action, d, context, option, this.cascadeUpdate);
                opData.push(od);
                wholeBeforeFns.push(...beforeFns);
                wholeAfterFns.push(...afterFns);
            }
        }
        else {
            const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(entity, action, data, context, option, this.cascadeUpdate, filter);
            opData = od;
            wholeBeforeFns.push(...beforeFns);
            wholeAfterFns.push(...afterFns);
        }
        const operation2 = Object.assign({}, operation, {
            data: opData,
        });
        for (const before of wholeBeforeFns) {
            before();
        }
        const count = this.doUpdateSingleRow(entity, operation2, context, option);
        for (const after of wholeAfterFns) {
            after();
        }
        return result;
    }
    /**
     *
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    async cascadeUpdateAsync(entity, operation, context, option) {
        const { action, data, filter, id } = operation;
        let opData;
        const wholeBeforeFns = [];
        const wholeAfterFns = [];
        if (['create', 'create-l'].includes(action) && data instanceof Array) {
            opData = [];
            for (const d of data) {
                const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(entity, action, d, context, option, this.cascadeUpdateAsync);
                opData.push(od);
                wholeBeforeFns.push(...beforeFns);
                wholeAfterFns.push(...afterFns);
            }
        }
        else {
            const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(entity, action, data, context, option, this.cascadeUpdateAsync, filter);
            opData = od;
            wholeBeforeFns.push(...beforeFns);
            wholeAfterFns.push(...afterFns);
        }
        const operation2 = Object.assign({}, operation, {
            data: opData,
        });
        let result = {};
        for (const before of wholeBeforeFns) {
            const result2 = await before();
            result = this.mergeMultipleResults([result, result2]);
        }
        const resultMe = await this.doUpdateSingleRowAsync(entity, operation2, context, option);
        result = this.mergeMultipleResults([result, resultMe]);
        for (const after of wholeAfterFns) {
            const result2 = await after();
            result = this.mergeMultipleResults([result, result2]);
        }
        return result;
    }
    cascadeSelect(entity, selection, context, option) {
        const { data, filter, indexFrom, count, sorter, distinct } = selection;
        const { projection, cascadeSelectionFns } = this.destructCascadeSelect(entity, data, context, this.cascadeSelect, this.aggregateSync, option);
        const rows = this.selectAbjointRow(entity, {
            data: projection,
            filter,
            indexFrom,
            count,
            sorter,
            distinct
        }, context, option);
        if (cascadeSelectionFns.length > 0) {
            const ruException = [];
            cascadeSelectionFns.forEach(ele => {
                try {
                    ele(rows);
                }
                catch (e) {
                    if (e instanceof types_1.OakRowUnexistedException) {
                        const rows = e.getRows();
                        ruException.push(...rows);
                    }
                    else {
                        throw e;
                    }
                }
            });
            if (ruException.length > 0) {
                throw new types_1.OakRowUnexistedException(ruException);
            }
        }
        return rows;
    }
    /**
     * 将一次查询的结果集加入result
     * todo 如果是supportMtoOJoin，这里还要解构（未充分测试）
     * @param entity
     * @param rows
     * @param context
     */
    addToResultSelections(entity, rows, context) {
        if (this.supportManyToOneJoin()) {
            // 这里的外键连接有可能为空，需要使用所有的行的attr的并集来测试
            const attrs = (0, lodash_1.uniq)(rows.map(ele => Object.keys(ele)).flat());
            const attrsToPick = [];
            for (const attr of attrs) {
                const data = {};
                const rel = this.judgeRelation(entity, attr);
                if (rel === 2) {
                    this.addToResultSelections(attr, rows.map(ele => ele[attr]).filter(ele => !!ele), context);
                }
                else if (typeof rel === 'string') {
                    this.addToResultSelections(rel, rows.map(ele => ele[attr]).filter(ele => !!ele), context);
                }
                else if (rel instanceof Array) {
                    this.addToResultSelections(rel[0], rows.map(ele => ele[attr]).reduce((prev, current) => prev.concat(current), []), context);
                }
                else {
                    attrsToPick.push(attr);
                }
            }
            const originRows = rows.map(ele => (0, lodash_1.pick)(ele, attrsToPick));
            this.addSingleRowToResultSelections(entity, originRows, context);
        }
        else {
            this.addSingleRowToResultSelections(entity, rows, context);
        }
    }
    addSingleRowToResultSelections(entity, rows, context) {
        const { opRecords } = context;
        let lastOperation = opRecords[opRecords.length - 1];
        if (lastOperation && lastOperation.a === 's') {
            const entityBranch = lastOperation.d[entity];
            if (entityBranch) {
                rows.forEach((row) => {
                    if (row && row.id) { // 如果没有row.id就不加入结果集了
                        const { id } = row;
                        if (!entityBranch[id]) {
                            Object.assign(entityBranch, {
                                [id]: (0, lodash_1.cloneDeep)(row),
                            });
                        }
                        else {
                            Object.assign(entityBranch[id], (0, lodash_1.cloneDeep)(row));
                        }
                    }
                });
                return;
            }
        }
        else {
            lastOperation = {
                a: 's',
                d: {},
            };
            opRecords.push(lastOperation);
        }
        const entityBranch = {};
        rows.forEach((row) => {
            if (row) {
                const { id } = row;
                Object.assign(entityBranch, {
                    [id]: (0, lodash_1.cloneDeep)(row),
                });
            }
        });
        Object.assign(lastOperation.d, {
            [entity]: entityBranch,
        });
    }
    async cascadeSelectAsync(entity, selection, context, option) {
        const { data, filter, indexFrom, count, sorter, total, randomRange, distinct } = selection;
        const { projection, cascadeSelectionFns } = this.destructCascadeSelect(entity, data, context, this.cascadeSelectAsync, this.aggregateAsync, option);
        const rows2 = await this.selectAbjointRowAsync(entity, {
            data: projection,
            filter,
            indexFrom,
            distinct,
            count: randomRange || count,
            sorter
        }, context, option);
        // 处理随机取值
        let rows = !randomRange ? rows2 : [];
        if (randomRange) {
            const possibility = count / rows2.length;
            let reduced = rows2.length - count;
            rows = rows2.filter(() => {
                const rand = Math.random();
                if (rand > possibility && reduced) {
                    reduced--;
                    return false;
                }
                return true;
            });
        }
        if (!option.dontCollect) {
            this.addToResultSelections(entity, rows, context);
        }
        if (cascadeSelectionFns.length > 0) {
            const ruException = [];
            await Promise.all(cascadeSelectionFns.map(async (ele) => {
                try {
                    await ele(rows);
                }
                catch (e) {
                    if (e instanceof types_1.OakRowUnexistedException) {
                        const rows = e.getRows();
                        ruException.push(...rows);
                    }
                    else {
                        throw e;
                    }
                }
            }));
            if (ruException.length > 0) {
                throw new types_1.OakRowUnexistedException(ruException);
            }
        }
        if (total) {
            const total2 = await this.countAsync(entity, {
                filter: selection.filter,
                count: total,
            }, context, option);
            Object.assign(rows, {
                '#total': total2,
            });
        }
        return rows;
    }
    async aggregateAsync(entity, aggregation, context, option) {
        await this.reinforceSelectionAsync(entity, aggregation, context, option, true);
        return this.aggregateAbjointRowAsync(entity, aggregation, context, option);
    }
    aggregateSync(entity, aggregation, context, option) {
        this.reinforceSelectionSync(entity, aggregation, context, option, true);
        return this.aggregateAbjointRowSync(entity, aggregation, context, option);
    }
    async selectAsync(entity, selection, context, option) {
        await this.reinforceSelectionAsync(entity, selection, context, option);
        return this.cascadeSelectAsync(entity, selection, context, option);
    }
    selectSync(entity, selection, context, option) {
        this.reinforceSelectionSync(entity, selection, context, option);
        return this.cascadeSelect(entity, selection, context, option);
    }
    operateSync(entity, operation, context, option) {
        //this.reinforceOperation(entity, operation);       // 感觉前台可以无视?
        return this.cascadeUpdate(entity, operation, context, option);
    }
    async operateAsync(entity, operation, context, option) {
        await this.reinforceOperation(entity, operation, context, option);
        return this.cascadeUpdateAsync(entity, operation, context, option);
    }
}
exports.CascadeStore = CascadeStore;
