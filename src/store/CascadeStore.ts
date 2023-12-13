import assert from "assert";
import {
    EntityDict, OperateOption, SelectOption, OperationResult, CreateAtAttribute,
    UpdateAtAttribute, AggregationResult, DeleteAtAttribute
} from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { OperationRewriter, RowStore, SelectionRewriter } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { combineFilters } from "./filter";
import { judgeRelation } from "./relation";
import { EXPRESSION_PREFIX, getAttrRefInExpression, OakRowUnexistedException } from "../types";
import { unset, uniq, cloneDeep, pick } from '../utils/lodash';
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { getRelevantIds } from "./filter";
import { CreateSingleOperation as CreateSingleOperOperation } from '../base-app-domain/Oper/Schema';
import { CreateOperation as CreateModiOperation, UpdateOperation as UpdateModiOperation } from '../base-app-domain/Modi/Schema';
import { generateNewIdAsync } from "../utils/uuid";
import { SYSTEM_RESERVE_ENTITIES } from "../compiler/entities";

/**这个用来处理级联的select和update，对不同能力的 */
export abstract class CascadeStore<ED extends EntityDict & BaseEntityDict> extends RowStore<ED> {
    constructor(storageSchema: StorageSchema<ED>) {
        super(storageSchema);
    }
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract supportMultipleCreate(): boolean;

    private selectionRewriters: SelectionRewriter<ED, AsyncContext<ED> | SyncContext<ED>, SelectOption>[] = [];
    private operationRewriters: OperationRewriter<ED, AsyncContext<ED> | SyncContext<ED>, OperateOption>[] = [];

    private async reinforceSelectionAsync<Cxt extends AsyncContext<ED>, Op extends SelectOption>(
        entity: keyof ED,
        selection: ED[keyof ED]['Selection'] | ED[keyof ED]['Aggregation'],
        context: Cxt,
        option: Op,
        isAggr?: true) {


        this.reinforceSelectionInner(entity, selection, context);

        const rewriterPromises = this.selectionRewriters.map(
            ele => ele(this.getSchema(), entity, selection, context, option, isAggr)
        );

        if (rewriterPromises.length > 0) {
            await Promise.all(rewriterPromises);
        }
    }

    private reinforceSelectionSync<Cxt extends SyncContext<ED>, Op extends SelectOption>(
        entity: keyof ED, 
        selection: ED[keyof ED]['Selection'], 
        context: Cxt, 
        option: Op,
        isAggr?: true
    ) {
        this.reinforceSelectionInner(entity, selection, context, isAggr);

        this.selectionRewriters.forEach(
            ele => {
                const result = ele(this.getSchema(), entity, selection, context, option);
                assert(!(result instanceof Promise));
            }
        );
    }

    private reinforceSelectionInner<Cxt extends AsyncContext<ED> | SyncContext<ED>>(
        entity: keyof ED,
        selection: ED[keyof ED]['Selection'] | ED[keyof ED]['Aggregation'],
        context: Cxt,
        isAggr?: true,
    ) {
        const { filter, data, sorter } = selection;

        const assignNecessaryProjectionAttrs = (projectionNode: ED[keyof ED]['Selection']['data'], attrs: string[]) => {
            attrs.forEach(
                (attr) => {
                    if (!projectionNode.hasOwnProperty(attr)) {
                        Object.assign(projectionNode, {
                            [attr]: 1,
                        });
                    }
                }
            );
        };


        const checkFilterNode = (
            entity2: keyof ED,
            filterNode: ED[keyof ED]['Selection']['filter'],
            projectionNode: ED[keyof ED]['Selection']['data'],
            toBeAssignNode: Record<string, string[]>,
            filterNodeDict: Record<string, ED[keyof ED]['Selection']['data']>) => {
            const necessaryAttrs: string[] = ['id'];
            for (const attr in filterNode) {
                if (attr === '#id') {
                    assert(!filterNodeDict[filterNode[attr]!], `projection中结点的id有重复, ${filterNode[attr]}`);
                    Object.assign(filterNodeDict, {
                        [filterNode[attr]!]: projectionNode,
                    });
                    if (toBeAssignNode[filterNode[attr]!]) {
                        assignNecessaryProjectionAttrs(projectionNode, toBeAssignNode[filterNode[attr]!]);
                    }
                }
                else if (['$and', '$or'].includes(attr)) {
                    for (const node of filterNode[attr]!) {
                        checkFilterNode(entity2, node, projectionNode, toBeAssignNode, filterNodeDict);
                    }
                }
                else if (attr === '$not') {
                    checkFilterNode(entity2, filterNode[attr]!, projectionNode, toBeAssignNode, filterNodeDict);
                }
                else if (attr === '$text') {
                    // 全文检索首先要有fulltext索引，其次要把fulltext的相关属性加到projection里
                    const { indexes } = this.getSchema()[entity2];

                    const fulltextIndex = indexes!.find(
                        ele => ele.config && ele.config.type === 'fulltext'
                    );

                    const { attributes } = fulltextIndex!;
                    necessaryAttrs.push(...(attributes.map(ele => ele.name as string)));
                }
                else {
                    if (attr.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
                        const exprResult = getAttrRefInExpression(filterNode[attr]!);
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
                            checkFilterNode(attr, filterNode[attr]!, projectionNode[attr], toBeAssignNode, filterNodeDict);
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
                            checkFilterNode(rel, filterNode[attr]!, projectionNode[attr], toBeAssignNode, filterNodeDict);
                        }
                        else if (rel instanceof Array) {
                            // 子查询，暂时不处理
                        }
                    }
                }
                assignNecessaryProjectionAttrs(projectionNode, necessaryAttrs);
            }
        };

        const checkSorterNode = (
            entity2: keyof ED,
            sorterNode: ED[keyof ED]['Selection']['sorter'],
            projectionNode: ED[keyof ED]['Selection']['data']) => {

            const checkSortAttr = (e2: keyof ED, sortAttr: Record<string, any>, projNode: ED[keyof ED]['Selection']['data']) => {
                const necessaryAttrs: string[] = [];
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
                        assert(typeof sortAttr[attr] === 'object');
                        checkSortAttr(rel, sortAttr[attr], projNode[attr]);
                    }
                    else {
                        assert(rel === 2);
                        if (!projNode[attr]) {
                            Object.assign(projNode, {
                                [attr]: {},
                            });
                        }
                        assert(typeof sortAttr[attr] === 'object');
                        checkSortAttr(attr, sortAttr[attr], projNode[attr]);
                    }
                }
            }
            sorterNode!.forEach(
                (node) => {
                    const { $attr } = node;
                    checkSortAttr(entity2, $attr, projectionNode);
                }
            );
        };

        let relevantIds: string[] = [];
        if (filter) {
            const toBeAssignNode: Record<string, string[]> = {};        // 用来记录在表达式中涉及到的结点
            // filter当中所关联到的属性必须在projection中
            const filterNodeDict: Record<string, ED[keyof ED]['Selection']['data']> = {};

            checkFilterNode(entity, filter, data, toBeAssignNode, filterNodeDict);
            relevantIds = getRelevantIds(filter);
        }

        // sorter也得取了，前端需要处理排序
        if (sorter) {
            checkSorterNode(entity, sorter, data);
        }

        const toBeAssignNode2: Record<string, string[]> = {};        // 用来记录在表达式中涉及到的结点
        const projectionNodeDict: Record<string, ED[keyof ED]['Selection']['data']> = {};
        const checkProjectionNode = (entity2: keyof ED, projectionNode: ED[keyof ED]['Selection']['data']) => {
            const necessaryAttrs: string[] = ['id', '$$createAt$$', '$$updateAt$$']; // 有的页面依赖于其它页面取数据，有时两个页面的filter的差异会导致有一个加createAt，有一个不加，此时可能产生前台取数据不完整的异常。先统一加上
            for (const attr in projectionNode) {
                if (attr === '#id') {
                    assert(!projectionNodeDict[projectionNode[attr]!], `projection中结点的id有重复, ${projectionNode[attr]}`);
                    Object.assign(projectionNodeDict, {
                        [projectionNode[attr]!]: projectionNode,
                    });
                    if (toBeAssignNode2[projectionNode[attr]!]) {
                        assignNecessaryProjectionAttrs(projectionNode, toBeAssignNode2[projectionNode[attr]!]);
                    }
                }
                else {
                    if (attr.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
                        const exprResult = getAttrRefInExpression(projectionNode[attr]!);
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
                        const rel = judgeRelation(this.getSchema(), entity2, attr);
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
            if (context instanceof AsyncContext) {
                const userId = context.getCurrentUserId(true);
                if (userId && !SYSTEM_RESERVE_ENTITIES.includes(entity2 as string)) {
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
                            } as ED['userRelation']['Selection'],
                        });
                    }
                }
            }
        };
        if (!isAggr) {
            // aggr的projetion不能改动
            checkProjectionNode(entity, data);
        }

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

    private async reinforceOperation<Cxt extends AsyncContext<ED>, Op extends OperateOption>(
        entity: keyof ED, 
        operation: ED[keyof ED]['Operation'], 
        context: Cxt,
        option: Op) {
        await Promise.all(this.operationRewriters.map(
            ele => ele(this.getSchema(), entity, operation, context, option)
        ));
    }

    public registerOperationRewriter(rewriter: OperationRewriter<ED, AsyncContext<ED> | SyncContext<ED>, OperateOption>) {
        this.operationRewriters.push(rewriter);
    }

    public registerSelectionRewriter(rewriter: SelectionRewriter<ED, AsyncContext<ED> | SyncContext<ED>, SelectOption>) {
        this.selectionRewriters.push(rewriter);
    }

    protected abstract selectAbjointRow<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Partial<ED[T]['Schema']>[];

    protected abstract updateAbjointRow<T extends keyof ED, OP extends OperateOption, Cxt extends SyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP): number;

    protected abstract selectAbjointRowAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Promise<Partial<ED[T]['Schema']>[]>;

    protected abstract countAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        selection: Pick<ED[T]['Selection'], 'filter' | 'count'>,
        context: Cxt, 
        option: OP
    ): Promise<number>;

    protected abstract updateAbjointRowAsync<T extends keyof ED, OP extends OperateOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'],
        context: Cxt,
        option: OP): Promise<number>;

    protected abstract aggregateAbjointRowSync<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP): AggregationResult<ED[T]['Schema']>;

    protected abstract aggregateAbjointRowAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP): Promise<AggregationResult<ED[T]['Schema']>>;

    protected destructCascadeSelect<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
        entity: T,
        projection2: ED[T]['Selection']['data'],
        context: Cxt,
        cascadeSelectFn: <T2 extends keyof ED>(entity2: T2, selection: ED[T2]['Selection'], context: Cxt, op: OP) => Partial<ED[T2]['Schema']>[] | Promise<Partial<ED[T2]['Schema']>[]>,
        aggregateFn: <T2 extends keyof ED>(entity2: T2, aggregation: ED[T2]['Aggregation'], context: Cxt, op: OP) => AggregationResult<ED[T2]['Schema']> | Promise<AggregationResult<ED[T2]['Schema']>>,
        option: OP) {
        const cascadeSelectionFns: Array<(result: Partial<ED[T]['Schema']>[]) => Promise<void> | void> = [];

        const supportMtoJoin = this.supportManyToOneJoin();
        const { toModi } = this.getSchema()[entity];

        assert(typeof projection2 === 'object');
        for (const attr in projection2) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
            }
            else if (relation === 2) {
                // 基于entity/entityId的多对一
                assert(typeof projection2[attr] === 'object');
                if (supportMtoJoin) {
                    cascadeSelectionFns.push(
                        (result) => {
                            if (!toModi) {
                                result.forEach(
                                    (ele) => {
                                        if (ele.entity === attr) {
                                            assert(ele.entityId);
                                            if (!ele[attr]) {
                                                throw new OakRowUnexistedException([{
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
                                    }
                                );
                            }
                        }
                    );
                    const {
                        projection: subProjection,
                        cascadeSelectionFns: subCascadeSelectionFns,
                    } = this.destructCascadeSelect(attr, projection2[attr], context, cascadeSelectFn, aggregateFn, option);
                    subCascadeSelectionFns.forEach(
                        ele => cascadeSelectionFns.push(
                            (result) => {
                                return ele(result.map(ele2 => ele2[attr] as any).filter(ele2 => !!ele2));
                            }
                        )
                    );
                }
                else {
                    cascadeSelectionFns.push(
                        (result) => {
                            const entityIds = uniq(result.filter(
                                ele => ele.entity === attr
                            ).map(
                                ele => {
                                    assert(ele.entityId !== null);
                                    return ele.entityId;
                                }
                            ) as string[]);

                            const dealWithSubRows = (subRows: Partial<ED[T]['Schema']>[]) => {
                                assert(subRows.length <= entityIds.length);
                                if (subRows.length < entityIds.length && !toModi) {
                                    // 后台不允许数据不一致
                                    if (context instanceof AsyncContext || !option.ignoreAttrMiss) {
                                        throw new OakRowUnexistedException([{
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

                                result.forEach(
                                    (ele) => {
                                        if (ele.entity === attr) {
                                            const subRow = subRows.find(
                                                ele2 => ele2.id === ele.entityId
                                            );
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
                                    }
                                );
                            };

                            if (entityIds.length > 0) {
                                const subRows = cascadeSelectFn.call(this, attr as any, {
                                    data: projection2[attr],
                                    filter: {
                                        id: {
                                            $in: entityIds
                                        },
                                    } as any,
                                }, context, option);
                                if (subRows instanceof Promise) {
                                    return subRows.then(
                                        (subRowss) => dealWithSubRows(subRowss)
                                    )
                                }
                                else {
                                    dealWithSubRows(subRows as any);
                                }
                            }
                        }
                    );
                }
            }
            else if (typeof relation === 'string') {
                assert(typeof projection2[attr] === 'object');
                if (supportMtoJoin) {
                    if (!toModi) {
                        // 如果不是modi，要保证外键没有空指针
                        cascadeSelectionFns.push(
                            (result) => {
                                if (!toModi) {
                                    result.forEach(
                                        (ele) => {
                                            if (ele[`${attr}Id`] && !ele[attr]) {
                                                throw new OakRowUnexistedException([{
                                                    entity: relation,
                                                    selection: {
                                                        data: projection2[attr],
                                                        filter: {
                                                            id: ele[`${attr}Id`],
                                                        }
                                                    }
                                                }]);
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                    const {
                        projection: subProjection,
                        cascadeSelectionFns: subCascadeSelectionFns,
                    } = this.destructCascadeSelect(relation, projection2[attr], context, cascadeSelectFn, aggregateFn, option);
                    subCascadeSelectionFns.forEach(
                        ele => cascadeSelectionFns.push(
                            (result) => {
                                return ele(result.map(ele2 => ele2[attr] as any).filter(ele2 => !!ele2));
                            }
                        )
                    );
                }
                else {
                    cascadeSelectionFns.push(
                        (result) => {
                            const ids = uniq(result.filter(
                                ele => !!(ele[`${attr}Id`])
                            ).map(
                                ele => ele[`${attr}Id`]
                            ) as string[]);

                            const dealWithSubRows = (subRows: Partial<ED[keyof ED]['Schema']>[]) => {
                                assert(subRows.length <= ids.length);
                                if (subRows.length < ids.length && !toModi) {
                                    if (context instanceof AsyncContext || !option.ignoreAttrMiss) {
                                        throw new OakRowUnexistedException([{
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

                                result.forEach(
                                    (ele) => {
                                        if (ele[`${attr}Id`]) {
                                            const subRow = subRows.find(
                                                ele2 => ele2.id === ele[`${attr}Id`]
                                            );
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
                                    }
                                );
                            };

                            if (ids.length > 0) {
                                const subRows = cascadeSelectFn.call(this, relation, {
                                    data: projection2[attr],
                                    filter: {
                                        id: {
                                            $in: ids
                                        },
                                    } as any,
                                }, context, option);
                                if (subRows instanceof Promise) {
                                    return subRows.then(
                                        (subRowss) => dealWithSubRows(subRowss)
                                    );
                                }
                                dealWithSubRows(subRows as any);
                            }
                        }
                    );
                }
            }
            else {
                assert(relation instanceof Array);
                const { data: subProjection, filter: subFilter, indexFrom, count, sorter: subSorter, total, randomRange } = projection2[attr];
                const [entity2, foreignKey] = relation;
                const isAggr = attr.endsWith('$$aggr');

                const otmAggrFn = (result: Partial<ED[T]['Schema']>[]) => {
                    const aggrResults = result.map(
                        async (row) => {
                            const filter2 = foreignKey ? combineFilters<ED, keyof ED>(entity2, this.getSchema(), [{
                                [foreignKey]: row.id,
                            }, subFilter]) : combineFilters<ED, keyof ED>(entity2, this.getSchema(), [{
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
                            assert(aggrResult instanceof Promise);
                            const aggrResultResult = await aggrResult;
                            return Object.assign(row, {
                                [attr]: aggrResultResult,
                            });
                        }
                    );
                    if (aggrResults.length > 0) {
                        return Promise.all(aggrResults).then(
                            () => undefined
                        );
                    }
                };

                /** 若一对多子查询没有indexFrom和count，可以优化成组查 */
                const otmGroupFn = (result: Partial<ED[T]['Schema']>[]) => {
                    const dealWithSubRows = (subRows: Partial<ED[T]['Schema']>[]) => {
                        // 这里如果result只有一行，则把返回结果直接置上，不对比外键值
                        // 这样做的原因是有的对象的filter会被改写掉（userId)，只能临时这样处理
                        // 看不懂了，应该不需要这个if了，不知道怎么重现测试 by Xc 20230906
                        if (result.length === 1) {
                            Object.assign(result[0], {
                                [attr]: subRows,
                            });
                        }
                        else {
                            result.forEach(
                                (ele) => {
                                    const subRowss = subRows.filter(
                                        (ele2) => {
                                            if (foreignKey) {
                                                return ele2[foreignKey] === ele.id;
                                            }
                                            return ele2.entityId === ele.id
                                        }
                                    );
                                    assert(subRowss);
                                    Object.assign(ele, {
                                        [attr]: subRowss,
                                    });
                                }
                            );
                        }
                    };

                    const ids = result.map(
                        ele => ele.id
                    ) as string[];
                    if (ids.length > 0) {
                        const filter2 = foreignKey ? combineFilters<ED, keyof ED>(entity2, this.getSchema(), [{
                            [foreignKey]: {
                                $in: ids,
                            },
                        }, subFilter]) : combineFilters<ED, keyof ED>(entity2, this.getSchema(), [{
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
                            return subRows.then(
                                (subRowss) => dealWithSubRows(subRowss)
                            );
                        }
                        dealWithSubRows(subRows as any);
                    }
                };

                /** 若一对多子查询有indexFrom和count，只能单行去连接 */
                const otmSingleFn = (result: Partial<ED[T]['Schema']>[]) => {
                    const dealWithSubRows2 = (row: Partial<ED[T]['Schema']>, subRows: Partial<ED[T]['Schema']>[]) => {
                        Object.assign(row, {
                            [attr]: subRows,
                        });
                    };

                    if (result.length > 0) {
                        const getSubRows = result.map(
                            (row) => {
                                const filter2 = foreignKey ? combineFilters<ED, keyof ED>(entity2, this.getSchema(), [{
                                    [foreignKey]: row.id!,
                                }, subFilter]) : combineFilters<ED, keyof ED>(entity2, this.getSchema(), [{
                                    entity,
                                    entityId: row.id!,
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
                                    return subRows.then(
                                        (subRowss) => dealWithSubRows2(row, subRowss)
                                    );
                                }
                                return dealWithSubRows2(row, subRows);
                            }
                        );
                        if (getSubRows[0] instanceof Promise) {
                            return Promise.all(getSubRows).then(
                                () => undefined
                            );
                        }
                        return;
                    }
                };

                if (isAggr) {
                    (context instanceof AsyncContext) && cascadeSelectionFns.push(
                        result => otmAggrFn(result)
                    );
                }
                else {
                    cascadeSelectionFns.push(
                        (result) => {
                            if (typeof indexFrom === 'number') {
                                assert(typeof count === 'number' && count > 0);
                                return otmSingleFn(result);
                            }
                            return otmGroupFn(result);
                        }
                    );
                }
            }
        }

        return {
            projection: projection2,
            cascadeSelectionFns,
        }
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
    protected destructCascadeUpdate<T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>, OP extends OperateOption, R>(
        entity: T,
        action: ED[T]['Action'],
        data: ED[T]['CreateSingle']['data'] | ED[T]['Update']['data'] | ED[T]['Remove']['data'],
        context: Cxt,
        option: OP,
        cascadeUpdate: <T2 extends keyof ED>(entity: T2,
            operation: ED[T2]['Operation'],
            context: Cxt,
            option: OP) => R,
        filter?: ED[T]['Update']['filter']
    ) {
        const modiAttr = this.getSchema()[entity].toModi;
        const option2 = Object.assign({}, option);

        const opData: Record<string, any> = {};
        const beforeFns: Array<() => R> = [];
        const afterFns: Array<() => R> = [];
        if (modiAttr && action !== 'remove' && !option.dontCreateModi) {
            // create/update具有modi对象的对象，对其子对象的update行为全部是create modi对象（缓存动作）
            // delete此对象，所有的modi子对象应该通过触发器作废，这个目前先通过系统的trigger来实现
            assert(!option2.modiParentId && !option2.modiParentEntity);
            if (action === 'create') {
                option2.modiParentId = data.id;
            }
            else {
                assert(filter?.id && typeof filter.id === 'string');
                option2.modiParentId = filter.id;
            }
            option2.modiParentEntity = entity as string;
        }
        for (const attr in data) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
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
                    assert(typeof fkId === 'string' || entity === attr);
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        assert(filterMto.id === fkId);
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: combineFilters(attr, this.getSchema(), [{
                                id: fkId,
                            }, filterMto]),
                        });
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
                        Object.assign(operationMto, {
                            filter: combineFilters(attr, this.getSchema(), [{
                                id: filter!.entityId,
                            }, filterMto]),
                        });
                    }
                    else if (filter![attr]) {
                        Object.assign(operationMto, {
                            filter: combineFilters(attr, this.getSchema(), [filter![attr], filterMto]),
                        });
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: combineFilters(attr, this.getSchema(), [{
                                [`${entity as string}$entity`]: {
                                    filter,
                                }
                            }, filterMto]),
                        });
                    }
                }

                beforeFns.push(
                    () => cascadeUpdate.call(this, attr, operationMto, context, option2)
                );
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
                    assert(typeof fkId === 'string');
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        assert(filterMto.id === fkId)
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: combineFilters(relation, this.getSchema(), [filterMto, {
                                id: fkId,
                            }]),
                        });
                    }
                }
                else {
                    assert(!data.hasOwnProperty(`${attr}Id`));
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        assert(typeof filterMto.id === 'string');
                    }
                    else if (filter![`${attr}Id`]) {
                        Object.assign(operationMto, {
                            filter: combineFilters(relation, this.getSchema(), [filterMto, {
                                id: filter![`${attr}Id`],
                            }]),
                        });
                    }
                    else if (filter![attr]) {
                        Object.assign(operationMto, {
                            filter: combineFilters(relation, this.getSchema(), [filterMto, filter![attr]]),
                        });
                    }
                    else {
                        // A中data的attrId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: combineFilters(relation, this.getSchema(), [filterMto, {
                                [`${entity as string}$${attr}`]: filter
                            }]),
                        });
                    }
                }

                beforeFns.push(
                    () => cascadeUpdate.call(this, relation, operationMto, context, option2)
                );
            }
            else {
                assert(relation instanceof Array);
                const [entityOtm, foreignKey] = relation;
                const otmOperations = data[attr];
                const dealWithOneToMany = (otm: ED[keyof ED]['Update'] | ED[keyof ED]['Create']) => {
                    const { action: actionOtm, data: dataOtm, filter: filterOtm } = otm;
                    if (!foreignKey) {
                        // 基于entity/entityId的one-to-many
                        if (action === 'create') {
                            const { id } = data;
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(
                                    ele => Object.assign(ele, {
                                        entity,
                                        entityId: id,
                                    })
                                );
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
                            const { id } = filter!;
                            assert(typeof id === 'string');
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(
                                    ele => Object.assign(ele, {
                                        entity,
                                        entityId: id,
                                    })
                                );
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
                                        filter: combineFilters(entityOtm, this.getSchema(), [{
                                            entity,
                                            entityId: filter.id,
                                        }, filterOtm]),
                                    });
                                }
                                else {
                                    Object.assign(otm, {
                                        filter: combineFilters(entityOtm, this.getSchema(), [{
                                            [entity]: filter,
                                        }, filterOtm]),
                                    });
                                }
                            }
                            else {
                                Object.assign(otm, {
                                    filter: combineFilters(entityOtm, this.getSchema(), [{
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
                                dataOtm.forEach(
                                    ele => Object.assign(ele, {
                                        [foreignKey]: id,
                                    })
                                );
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
                            const { id } = filter!;
                            assert(typeof id === 'string');
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(
                                    ele => Object.assign(ele, {
                                        [foreignKey]: id,
                                    })
                                );
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
                                        filter: combineFilters(entityOtm, this.getSchema(), [{
                                            [foreignKey]: filter.id,
                                        }, filterOtm]),
                                    });
                                }
                                else {
                                    Object.assign(otm, {
                                        filter: combineFilters(entityOtm, this.getSchema(), [{
                                            [foreignKey.slice(0, foreignKey.length - 2)]: filter,
                                        }, filterOtm]),
                                    });
                                }
                            }
                            else {
                                Object.assign(otm, {
                                    filter: combineFilters(entityOtm, this.getSchema(), [{
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
                    afterFns.push(() => cascadeUpdate.call(this, entityOtm!, otm, context, option2));
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
    protected preProcessDataCreated<T extends keyof ED>(entity: T, data: ED[T]['Create']['data']) {
        const now = Date.now();
        const { attributes } = this.getSchema()[entity];
        const processSingle = (data2: ED[T]['CreateSingle']['data']) => {
            for (const key in attributes) {
                if (data2[key] === undefined) {
                    Object.assign(data2, {
                        [key]: null,
                    });
                }
            }
            Object.assign(data2, {
                [CreateAtAttribute]: now,
                [UpdateAtAttribute]: now,
                [DeleteAtAttribute]: null,
            });
        }
        if (data instanceof Array) {
            data.forEach(
                ele => processSingle(ele)
            );
        }
        else {
            processSingle(data as ED[T]['CreateSingle']['data']);
        }
    }

    // 对更新的数据，去掉所有的undefined属性
    protected preProcessDataUpdated(data: Record<string, any>) {
        const undefinedKeys = Object.keys(data).filter(
            ele => data[ele] === undefined
        );
        undefinedKeys.forEach(
            ele => unset(data, ele)
        );
    }


    judgeRelation(entity: keyof ED, attr: string) {
        return judgeRelation(this.storageSchema, entity, attr);
    }

    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity 
     * @param operation 
     * @param context 
     * @param option 
     */
    private async doUpdateSingleRowAsync<T extends keyof ED, OP extends OperateOption, Cxt extends AsyncContext<ED>>(entity: T,
        operation: ED[T]['CreateSingle'] | ED[T]['Update'] | ED[T]['Remove'],
        context: Cxt,
        option: OP
    ): Promise<OperationResult<ED>> {
        const { data, action, id: operId, filter } = operation;
        const now = Date.now();

        switch (action) {
            case 'create': {
                if (option.modiParentEntity && !['modi', 'modiEntity', 'oper', 'operEntity'].includes(entity as string)) {
                    // 变成对modi的插入
                    assert(option.modiParentId);
                    const modiCreate: CreateModiOperation = {
                        id: 'dummy',
                        action: 'create',
                        data: {
                            id: operId!,
                            targetEntity: entity as string,
                            action,
                            entity: option.modiParentEntity!,
                            entityId: option.modiParentId!,
                            filter: {
                                id: (data as any).id,  //这里记录这个filter是为了后面update的时候直接在其上面update，参见本函数后半段关于modiUpsert相关的优化
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
                    } as OperationResult<ED>;
                }
                else {
                    this.preProcessDataCreated(entity, data as ED[T]['Create']['data']);
                    let result = 0;
                    const createInner = async (operation2: ED[T]['Create']) => {
                        try {
                            await this.updateAbjointRowAsync(
                                entity,
                                operation2,
                                context,
                                option
                            );
                        }
                        catch (e: any) {
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
                            await createInner(operation as ED[T]['Create']);
                        }
                        else {
                            for (const d of data) {
                                const createSingleOper: ED[T]['CreateSingle'] = {
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
                        await createInner(operation as ED[T]['Create']);
                    }

                    if (!option.dontCollect) {
                        context.saveOpRecord(entity, operation);
                        /* context.opRecords.push({
                            a: 'c',
                            e: entity,
                            d: data as ED[T]['OpSchema'] | ED[T]['OpSchema'][],
                        }); */
                    }
                    if (!option.dontCreateOper && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity as string)) {
                        // 按照框架要求生成Oper和OperEntity这两个内置的对象
                        assert(operId);
                        const operatorId = context.getCurrentUserId(true);
                        if (operatorId) {
                            const createOper: CreateSingleOperOperation = {
                                id: 'dummy',
                                action: 'create',
                                data: {
                                    id: operId,
                                    action,
                                    data,
                                    operatorId,
                                    targetEntity: entity as string,
                                    operEntity$oper: data instanceof Array ? {
                                        id: 'dummy',
                                        action: 'create',
                                        data: await Promise.all(
                                            data.map(
                                                async (ele) => ({
                                                    id: await generateNewIdAsync(),
                                                    entityId: ele.id,
                                                    entity: entity as string,
                                                })
                                            )
                                        ),
                                    } : [{
                                        id: 'dummy',
                                        action: 'create',
                                        data: {
                                            id: await generateNewIdAsync(),
                                            entityId: (data as ED[T]['CreateSingle']['data']).id,
                                            entity: entity as string,
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
                            ['create' as ED[T]['Action']]: result,
                        }
                    } as OperationResult<ED>;
                }
            }
            default: {
                // 这里要优化一下，显式的对id的update/remove不要去查了，节省数据库层的性能（如果这些row是建立在一个create的modi上也查不到）
                const ids = getRelevantIds(filter);
                if (ids.length === 0) {
                    const selection: ED[T]['Selection'] = {
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
                    ids.push(...(rows.map(ele => ele.id! as string)));
                }
                if (data) {
                    this.preProcessDataUpdated(data);
                }

                if (option.modiParentEntity && !['modi', 'modiEntity'].includes(entity as string)) {
                    // 延时更新，变成对modi的插入
                    // 变成对modi的插入
                    // 优化，这里如果是对同一个targetEntity反复update，则变成对最后一条create/update的modi进行update，以避免发布文章这样的需求时产生过多的modi
                    let modiUpsert: CreateModiOperation | UpdateModiOperation | undefined;
                    if (action !== 'remove') {
                        const upsertModis = await this.selectAbjointRowAsync('modi', {
                            data: {
                                id: 1,
                                data: 1,
                            },
                            filter: {
                                targetEntity: entity as string,
                                action: {
                                    $in: ['create', 'update'],
                                },
                                entity: option.modiParentEntity!,
                                entityId: option.modiParentId!,
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
                                    id: originId as string,
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
                                targetEntity: entity as string,
                                entity: option.modiParentEntity!,
                                entityId: option.modiParentId!,
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
                                data: await Promise.all(
                                    ids.map(
                                        async (id) => ({
                                            id: await generateNewIdAsync(),
                                            entity: entity as string,
                                            entityId: id,
                                        })
                                    )
                                ),
                            };
                        }
                    }
                    const closeRootMode = context.openRootMode();
                    await this.cascadeUpdateAsync('modi', modiUpsert!, context, option);
                    closeRootMode();
                    return {
                        modi: {
                            ['create' as ED['modi']['Action']]: 1,
                        },
                    };
                }
                else {
                    const createOper = async () => {
                        if (!option?.dontCreateOper && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity as string) && ids.length > 0) {
                            // 按照框架要求生成Oper和OperEntity这两个内置的对象
                            assert(operId);
                            const createOper: CreateSingleOperOperation = {
                                id: 'dummy',
                                action: 'create',
                                data: {
                                    id: operId,
                                    action,
                                    data,
                                    targetEntity: entity as string,
                                    operEntity$oper: {
                                        id: 'dummy',
                                        action: 'create',
                                        data: await Promise.all(
                                            ids.map(
                                                async (ele) => ({
                                                    id: await generateNewIdAsync(),
                                                    entityId: ele,
                                                    entity: entity as string,
                                                })
                                            )
                                        )
                                    },
                                },
                            }
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
                                    data: data as ED[T]['Update']['data'],
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
                            [action as ED[T]['Action']]: ids.length,
                        }
                    } as OperationResult<ED>;
                }
            }
        }
    }

    private doUpdateSingleRow<T extends keyof ED, OP extends OperateOption, Cxt extends SyncContext<ED>>(entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP
    ) {
        const { data, action, id: operId, filter } = operation;
        const now = Date.now();

        switch (action) {
            case 'create': {
                this.preProcessDataCreated(entity, data as ED[T]['Create']['data']);
                let result = 0;
                const createInner = (operation2: ED[T]['Create']) => {
                    try {
                        result += this.updateAbjointRow(
                            entity,
                            operation2,
                            context,
                            option
                        );
                    }
                    catch (e: any) {
                        throw e;
                    }
                };

                if (data instanceof Array) {
                    const multipleCreate = this.supportMultipleCreate();
                    if (multipleCreate) {
                        createInner(operation as ED[T]['Create']);
                    }
                    else {
                        for (const d of data) {
                            const createSingleOper: ED[T]['CreateSingle'] = {
                                id: 'any',
                                action: 'create',
                                data: d,
                            };
                            createInner(createSingleOper);
                        }
                    }
                }
                else {
                    createInner(operation as ED[T]['Create']);
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

    protected cascadeUpdate<T extends keyof ED, Cxt extends SyncContext<ED>, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP): OperationResult<ED> {

        const { action, data, filter, id } = operation;
        let opData: any;
        const wholeBeforeFns: Array<() => any> = [];
        const wholeAfterFns: Array<() => any> = [];
        const result: OperationResult<ED> = {};

        if (['create', 'create-l'].includes(action) && data instanceof Array) {
            opData = [];
            for (const d of data) {
                const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(
                    entity,
                    action,
                    d,
                    context,
                    option,
                    this.cascadeUpdate,
                );
                opData.push(od);
                wholeBeforeFns.push(...beforeFns);
                wholeAfterFns.push(...afterFns);
            }
        }
        else {
            const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(
                entity,
                action,
                data,
                context,
                option,
                this.cascadeUpdate,
                filter
            );
            opData = od;
            wholeBeforeFns.push(...beforeFns);
            wholeAfterFns.push(...afterFns);
        }

        const operation2: ED[T]['CreateSingle'] | ED[T]['Update'] | ED[T]['Remove'] =
            Object.assign({}, operation as ED[T]['CreateSingle'] | ED[T]['Update'] | ED[T]['Remove'], {
                data: opData as ED[T]['OpSchema'],
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
    protected async cascadeUpdateAsync<T extends keyof ED, Cxt extends AsyncContext<ED>, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP): Promise<OperationResult<ED>> {
        const { action, data, filter, id } = operation;
        let opData: any;
        const wholeBeforeFns: Array<() => Promise<OperationResult<ED>>> = [];
        const wholeAfterFns: Array<() => Promise<OperationResult<ED>>> = [];

        if (['create', 'create-l'].includes(action) && data instanceof Array) {
            opData = [];
            for (const d of data) {
                const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(
                    entity,
                    action,
                    d,
                    context,
                    option,
                    this.cascadeUpdateAsync,
                );
                opData.push(od);
                wholeBeforeFns.push(...beforeFns);
                wholeAfterFns.push(...afterFns);
            }
        }
        else {
            const { data: od, beforeFns, afterFns } = this.destructCascadeUpdate(
                entity,
                action,
                data,
                context,
                option,
                this.cascadeUpdateAsync,
                filter
            );
            opData = od;
            wholeBeforeFns.push(...beforeFns);
            wholeAfterFns.push(...afterFns);
        }

        const operation2: ED[T]['CreateSingle'] | ED[T]['Update'] | ED[T]['Remove'] =
            Object.assign({}, operation as ED[T]['CreateSingle'] | ED[T]['Update'] | ED[T]['Remove'], {
                data: opData as ED[T]['OpSchema'],
            });

        let result: OperationResult<ED> = {};
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

    protected cascadeSelect<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Partial<ED[T]['Schema']>[] {
        const { data, filter, indexFrom, count, sorter } = selection;
        const { projection, cascadeSelectionFns } = this.destructCascadeSelect(
            entity,
            data,
            context,
            this.cascadeSelect,
            this.aggregateSync,
            option);

        const rows = this.selectAbjointRow(entity, {
            data: projection,
            filter,
            indexFrom,
            count,
            sorter
        }, context, option);


        if (cascadeSelectionFns.length > 0) {
            const ruException: Array<{
                entity: keyof ED,
                selection: ED[keyof ED]['Selection']
            }> = [];
            cascadeSelectionFns.forEach(
                ele => {
                    try {
                        ele(rows);
                    }
                    catch (e) {
                        if (e instanceof OakRowUnexistedException) {
                            const rows = e.getRows();
                            ruException.push(...rows);
                        }
                        else {
                            throw e;
                        }
                    }
                }
            )

            if (ruException.length > 0) {
                throw new OakRowUnexistedException(ruException);
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
    private addToResultSelections<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, rows: Partial<ED[T]['Schema']>[], context: Cxt) {
        if (this.supportManyToOneJoin()) {
            // 这里的外键连接有可能为空，需要使用所有的行的attr的并集来测试
            const attrs = uniq(rows.map(
                ele => Object.keys(ele)
            ).flat());
            const attrsToPick: string[] = [];

            for (const attr of attrs) {
                const data: Partial<ED[T]['Schema']> = {}
                const rel = this.judgeRelation(entity, attr);
                if (rel === 2) {
                    this.addToResultSelections(attr, rows.map(ele => ele[attr]!).filter(ele => !!ele), context);
                }
                else if (typeof rel === 'string') {
                    this.addToResultSelections(rel, rows.map(ele => ele[attr]!).filter(ele => !!ele), context);
                }
                else if (rel instanceof Array) {
                    this.addToResultSelections(rel[0], rows.map(ele => ele[attr]!).reduce((prev, current) => prev.concat(current), [] as any[]), context);
                }
                else {
                    attrsToPick.push(attr);
                }
            }
            const originRows = rows.map(
                ele => pick(ele, attrsToPick)
            ) as Partial<ED[T]['Schema']>[];
            this.addSingleRowToResultSelections(entity, originRows, context);
        }
        else {
            this.addSingleRowToResultSelections(entity, rows, context);
        }
    }

    private addSingleRowToResultSelections<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, rows: Partial<ED[T]['OpSchema']>[], context: Cxt) {
        const { opRecords } = context;

        let lastOperation = opRecords[opRecords.length - 1];
        if (lastOperation && lastOperation.a === 's') {
            const entityBranch = lastOperation.d[entity];
            if (entityBranch) {
                rows.forEach(
                    (row) => {
                        if (row) {
                            assert(row.id);
                            const { id } = row;
                            if (!entityBranch![id!]) {
                                Object.assign(entityBranch!, {
                                    [id!]: cloneDeep(row),
                                });
                            }
                            else {
                                Object.assign(entityBranch[id], cloneDeep(row));
                            }
                        }
                    }
                );
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
        rows.forEach(
            (row) => {
                if (row) {
                    const { id } = row as { id: string };
                    Object.assign(entityBranch!, {
                        [id!]: cloneDeep(row),
                    });
                }
            }
        );
        Object.assign(lastOperation.d, {
            [entity]: entityBranch,
        });
    }

    protected async cascadeSelectAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Promise<Partial<ED[T]['Schema']>[]> {
        const { data, filter, indexFrom, count, sorter, total, randomRange } = selection;
        const { projection, cascadeSelectionFns } = this.destructCascadeSelect(
            entity,
            data,
            context,
            this.cascadeSelectAsync,
            this.aggregateAsync,
            option);

        const rows2 = await this.selectAbjointRowAsync(entity, {
            data: projection,
            filter,
            indexFrom,
            count: randomRange || count,
            sorter
        }, context, option);

        // 处理随机取值
        let rows = !randomRange ? rows2 : [];
        if (randomRange) {
            const possibility = count! / rows2.length;
            let reduced = rows2.length - count!;
            rows = rows2.filter(
                () => {
                    const rand = Math.random();
                    if (rand > possibility && reduced) {
                        reduced--;
                        return false;
                    }
                    return true;
                }
            );
        }

        if (!option.dontCollect) {
            this.addToResultSelections(entity, rows, context);
        }

        if (cascadeSelectionFns.length > 0) {
            const ruException: Array<{
                entity: keyof ED,
                selection: ED[keyof ED]['Selection']
            }> = [];
            await Promise.all(
                cascadeSelectionFns.map(
                    async ele => {
                        try {
                            await ele(rows);
                        }
                        catch (e) {
                            if (e instanceof OakRowUnexistedException) {
                                const rows = e.getRows();
                                ruException.push(...rows);
                            }
                            else {
                                throw e;
                            }
                        }
                    }
                )
            );

            if (ruException.length > 0) {
                throw new OakRowUnexistedException(ruException);
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

    protected async aggregateAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP
    ): Promise<AggregationResult<ED[T]['Schema']>> {
        await this.reinforceSelectionAsync(entity, aggregation, context, option, true);
        return this.aggregateAbjointRowAsync(entity, aggregation, context, option);
    }

    protected aggregateSync<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP
    ): AggregationResult<ED[T]['Schema']> {
        this.reinforceSelectionSync(entity, aggregation, context, option, true);
        return this.aggregateAbjointRowSync(entity, aggregation, context, option);
    }

    protected async selectAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Promise<Partial<ED[T]['Schema']>[]> {
        await this.reinforceSelectionAsync(entity, selection, context, option);
        return this.cascadeSelectAsync(entity, selection, context, option);
    }

    protected selectSync<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Partial<ED[T]['Schema']>[] {
        this.reinforceSelectionSync(entity, selection, context, option);
        return this.cascadeSelect(entity, selection, context, option);
    }

    protected operateSync<T extends keyof ED, Cxt extends SyncContext<ED>, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP): OperationResult<ED> {

        //this.reinforceOperation(entity, operation);       // 感觉前台可以无视?
        return this.cascadeUpdate(entity, operation, context, option);
    }

    protected async operateAsync<T extends keyof ED, Cxt extends AsyncContext<ED>, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Cxt,
        option: OP): Promise<OperationResult<ED>> {
        await this.reinforceOperation(entity, operation, context, option);
        return this.cascadeUpdateAsync(entity, operation, context, option);
    }
}