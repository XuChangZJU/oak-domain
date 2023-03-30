import assert from "assert";
import {
    EntityDict,
    OperateOption, SelectOption, OperationResult, CreateAtAttribute, UpdateAtAttribute, AggregationResult, DeleteAtAttribute
} from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { addFilterSegment, combineFilters } from "./filter";
import { judgeRelation } from "./relation";
import { OakRowUnexistedException } from "../types";
import { unset, uniq, cloneDeep, pick } from '../utils/lodash';
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { getRelevantIds } from "./filter";
import { CreateSingleOperation as CreateSingleOperOperation } from '../base-app-domain/Oper/Schema';
import { CreateOperation as CreateModiOperation, UpdateOperation as UpdateModiOperation } from '../base-app-domain/Modi/Schema';
import { generateNewIdAsync } from "../utils/uuid";
import { reinforceOperation, reinforceSelection } from "./selection";

/**这个用来处理级联的select和update，对不同能力的 */
export abstract class CascadeStore<ED extends EntityDict & BaseEntityDict> extends RowStore<ED> {
    constructor(storageSchema: StorageSchema<ED>) {
        super(storageSchema);
    }
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract supportMultipleCreate(): boolean;

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

    protected abstract updateAbjointRowAsync<T extends keyof ED, OP extends OperateOption, Cxt extends AsyncContext<ED>>(
        entity: T,
        operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'],
        context: Cxt,
        option: OP): Promise<number>;

    protected abstract aggregateSync<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        aggregation: ED[T]['Aggregation'],
        context: Cxt,
        option: OP): AggregationResult<ED[T]['Schema']>;

    protected abstract aggregateAsync<T extends keyof ED, OP extends SelectOption, Cxt extends AsyncContext<ED>>(
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
        const projection: ED[T]['Selection']['data'] = {};
        const cascadeSelectionFns: Array<(result: Partial<ED[T]['Schema']>[]) => Promise<void> | void> = [];

        const supportMtoJoin = this.supportManyToOneJoin();
        const { toModi } = this.getSchema()[entity];

        for (const attr in projection2) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
                Object.assign(projection, {
                    [attr]: projection2[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity/entityId的多对一
                Object.assign(projection, {
                    entity: 1,
                    entityId: 1,
                });
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
                    Object.assign(projection, {
                        [attr]: subProjection,
                    });
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
                            const dealWithSubRows = (subRows: Partial<ED[T]['Schema']>[]) => {
                                assert(subRows.length <= entityIds.length);
                                if (subRows.length < entityIds.length && !toModi) {
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
                            const entityIds = uniq(result.filter(
                                ele => ele.entity === attr
                            ).map(
                                ele => {
                                    assert(ele.entityId !== null);
                                    return ele.entityId;
                                }
                            ) as string[]);

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
                            else {

                            }
                        }
                    );
                }
            }
            else if (typeof relation === 'string') {
                Object.assign(projection, {
                    [`${attr}Id`]: 1,
                });
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
                    Object.assign(projection, {
                        [attr]: subProjection,
                    });
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
                            const dealWithSubRows = (subRows: Partial<ED[keyof ED]['Schema']>[]) => {
                                assert(subRows.length <= ids.length);
                                if (subRows.length < ids.length && !toModi) {
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
                            const ids = uniq(result.filter(
                                ele => !!(ele[`${attr}Id`])
                            ).map(
                                ele => ele[`${attr}Id`]
                            ) as string[]);

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
                const { data: subProjection, filter: subFilter, indexFrom, count, sorter: subSorter } = projection2[attr];
                const [entity2, foreignKey] = relation;
                const isAggr = attr.endsWith('$$aggr');
                if (foreignKey) {
                    // 基于属性的一对多
                    if (isAggr) {
                        // 是聚合运算
                        cascadeSelectionFns.push(
                            (result) => {
                                const aggrResults = result.map(
                                    (row) => {
                                        const aggrResult = aggregateFn.call(this, entity2, {
                                            data: subProjection,
                                            filter: combineFilters([{
                                                [foreignKey]: row.id,
                                            }, subFilter]),
                                            sorter: subSorter,
                                            indexFrom,
                                            count
                                        }, context, option);
                                        if (aggrResult instanceof Promise) {
                                            return aggrResult.then(
                                                (aggrResultResult) => Object.assign(row, {
                                                    [attr]: aggrResultResult,
                                                })
                                            );
                                        }
                                        else {
                                            Object.assign(row, {
                                                [attr]: aggrResult,
                                            });
                                        }
                                    }
                                );
                                if (aggrResults.length > 0 && aggrResults[0] instanceof Promise) {
                                    return Promise.all(aggrResults).then(
                                        () => undefined
                                    );
                                }
                            }
                        );
                    }
                    else {
                        // 是一对多查询
                        cascadeSelectionFns.push(
                            (result) => {
                                const ids = result.map(
                                    ele => ele.id
                                ) as string[];

                                const dealWithSubRows = (subRows: Partial<ED[keyof ED]['Schema']>[]) => {
                                    result.forEach(
                                        (ele) => {
                                            const subRowss = subRows.filter(
                                                ele2 => ele2[foreignKey] === ele.id
                                            );
                                            assert(subRowss);
                                            Object.assign(ele, {
                                                [attr]: subRowss,
                                            });
                                        }
                                    );
                                };

                                if (ids.length > 0) {
                                    const subRows = cascadeSelectFn.call(this, entity2, {
                                        data: subProjection,
                                        filter: combineFilters([{
                                            [foreignKey]: {
                                                $in: ids,
                                            }
                                        }, subFilter]),
                                        sorter: subSorter,
                                        indexFrom,
                                        count
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
                    // 基于entity的多对一
                    if (isAggr) {
                        // 是聚合运算
                        cascadeSelectionFns.push(
                            (result) => {
                                const aggrResults = result.map(
                                    (row) => {
                                        const aggrResult = aggregateFn.call(this, entity2, {
                                            data: subProjection,
                                            filter: combineFilters([{
                                                entity,
                                                entityId: row.id,
                                            }, subFilter]),
                                            sorter: subSorter,
                                            indexFrom,
                                            count
                                        }, context, option);
                                        if (aggrResult instanceof Promise) {
                                            return aggrResult.then(
                                                (aggrResultResult) => Object.assign(row, {
                                                    [attr]: aggrResultResult,
                                                })
                                            );
                                        }
                                        else {
                                            Object.assign(row, {
                                                [attr]: aggrResult,
                                            });
                                        }
                                    }
                                );
                                if (aggrResults.length > 0 && aggrResults[0] instanceof Promise) {
                                    return Promise.all(aggrResults).then(
                                        () => undefined
                                    );
                                }
                            }
                        );
                    }
                    else {
                        // 是一对多查询
                        cascadeSelectionFns.push(
                            (result) => {
                                const ids = result.map(
                                    ele => ele.id
                                ) as string[];
                                const dealWithSubRows = (subRows: Partial<ED[T]['Schema']>[]) => {
                                    result.forEach(
                                        (ele) => {
                                            const subRowss = subRows.filter(
                                                ele2 => ele2.entityId === ele.id
                                            );
                                            assert(subRowss);
                                            Object.assign(ele, {
                                                [attr]: subRowss,
                                            });
                                        }
                                    );
                                };

                                if (ids.length > 0) {
                                    const subRows = cascadeSelectFn.call(this, entity2, {
                                        data: subProjection,
                                        filter: combineFilters([{
                                            entity,
                                            entityId: {
                                                $in: ids,
                                            }
                                        }, subFilter]),
                                        sorter: subSorter,
                                        indexFrom,
                                        count
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
            }
        }

        return {
            projection,
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
                            filter: addFilterSegment({
                                id: fkId,
                            }), filterMto,
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
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: addFilterSegment({
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
                            }, filterMto),
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
                            filter: addFilterSegment(filterMto || {}, {
                                id: fkId,
                            }),
                        });
                    }
                }
                else {
                    assert(!data.hasOwnProperty(`${attr}Id`));
                    if (filterMto?.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        assert(typeof filterMto.id === 'string');
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto, {
                            filter: addFilterSegment(filterMto || {}, {
                                id: {
                                    $in: {
                                        entity,
                                        data: {
                                            [`${attr}Id`]: 1,
                                        },
                                        filter,
                                    }
                                },
                            }),
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
                            // 除了性能原因之外，还因为会制造出user: { id: xxx }这样的查询，general中不允许这样查询的出现
                            // 暂时先封掉user上的相关更新条件，会制造出连接表上的update
                            if (entity !== 'user') {
                                if (filter) {
                                    if (filter.id && Object.keys(filter).length === 1) {
                                        Object.assign(otm, {
                                            filter: addFilterSegment({
                                                entity,
                                                entityId: filter.id,
                                            }, filterOtm),
                                        });
                                    }
                                    else {
                                        Object.assign(otm, {
                                            filter: addFilterSegment({
                                                [entity]: filter,
                                            }, filterOtm),
                                        });
                                    }
                                }
                                if (action === 'remove' && actionOtm === 'update') {
                                    Object.assign(dataOtm, {
                                        entity: null,
                                        entityId: null,
                                    });
                                }
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
                            // 除了性能原因之外，还因为会制造出user: { id: xxx }这样的查询，general中不允许这样查询的出现
                            // 绝大多数情况都是id，但也有可能update可能出现上层filter不是根据id的（userEntityGrant的过期触发的wechatQrCode的过期，见general中的userEntityGrant的trigger）
                            // 暂时先封掉user上的连接，以避免生成连接表更新
                            if (entity !== 'user') {
                                if (filter) {
                                    if (filter.id && Object.keys(filter).length === 1) {
                                        Object.assign(otm, {
                                            filter: addFilterSegment({
                                                [foreignKey]: filter.id,
                                            }, filterOtm),
                                        });
                                    }
                                    else {
                                        Object.assign(otm, {
                                            filter: addFilterSegment({
                                                [foreignKey.slice(0, foreignKey.length - 2)]: filter,
                                            }, filterOtm),
                                        });
                                    }
                                }
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
    ) {
        const { data, action, id: operId, filter } = operation;
        const now = Date.now();

        switch (action) {
            case 'create': {
                this.preProcessDataCreated(entity, data as ED[T]['Create']['data']);
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
                                id: {
                                    $in: [(data as any).id as string],      //这里记录这个filter是为了后面update的时候直接在其上面update，参见本函数后半段关于modiUpsert相关的优化
                                },
                            },
                            data,
                            iState: 'active',
                        },
                    };
                    await this.cascadeUpdateAsync('modi', modiCreate, context, option);
                    return 1;
                }
                else {
                    let result = 0;
                    const createInner = async (operation2: ED[T]['Create']) => {
                        try {
                            result += await this.updateAbjointRowAsync(
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
                        await createInner(operation as ED[T]['Create']);
                    }

                    if (!option.dontCollect) {
                        context.opRecords.push({
                            a: 'c',
                            e: entity,
                            d: data as ED[T]['OpSchema'] | ED[T]['OpSchema'][],
                        });
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
                                            targetEntityId: (data as ED[T]['CreateSingle']['data']).id,
                                        },
                                    }]
                                },
                            };
                            await this.cascadeUpdateAsync('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            });
                        }
                    }
                    return result!;
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
                    await this.cascadeUpdateAsync('modi', modiUpsert!, context, option);
                    return 1;
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
                            await this.cascadeUpdateAsync('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            });
                        }
                    };
                    if (action === 'remove') {
                        if (!option.dontCollect) {
                            context.opRecords.push({
                                a: 'r',
                                e: entity,
                                f: {
                                    id: {
                                        $in: ids,
                                    }
                                },
                            });
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
                                context.opRecords.push({
                                    a: 'u',
                                    e: entity,
                                    d: data as ED[T]['Update']['data'],
                                    f: {
                                        id: {
                                            $in: ids,
                                        }
                                    },
                                });
                            }
                        }
                        else if (action !== 'update') {
                            // 如果不是update动作而是用户自定义的动作，这里还是要记录oper
                            await createOper();
                            return 0;
                        }
                        else {
                            return 0;
                        }
                    }

                    const result = await this.updateAbjointRowAsync(entity, operation, context, option);
                    await createOper();

                    return result;
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
        reinforceOperation(this.getSchema(), entity, operation);
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
        reinforceOperation(this.getSchema(), entity, operation);
        const { action, data, filter, id } = operation;
        let opData: any;
        const wholeBeforeFns: Array<() => Promise<any>> = [];
        const wholeAfterFns: Array<() => Promise<any>> = [];
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

        for (const before of wholeBeforeFns) {
            await before();
        }
        const count = await this.doUpdateSingleRowAsync(entity, operation2, context, option);
        this.mergeOperationResult(result, {
            [entity]: {
                [operation2.action]: count,
            }
        } as OperationResult<ED>);
        for (const after of wholeAfterFns) {
            await after();
        }
        return result;
    }

    protected cascadeSelect<T extends keyof ED, OP extends SelectOption, Cxt extends SyncContext<ED>>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt,
        option: OP): Partial<ED[T]['Schema']>[] {
        reinforceSelection(this.getSchema(), entity, selection);
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
            const attrsToPick: string[] = [];
            for (const attr in rows[0]) {
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
                                    [id!]: row,
                                });
                            }
                            else {
                                Object.assign(entityBranch[id], row);
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
                        [id!]: row,
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
        reinforceSelection(this.getSchema(), entity, selection);
        const { data, filter, indexFrom, count, sorter } = selection;
        const { projection, cascadeSelectionFns } = this.destructCascadeSelect(
            entity,
            data,
            context,
            this.cascadeSelectAsync,
            this.aggregateAsync,
            option);

        const rows = await this.selectAbjointRowAsync(entity, {
            data: projection,
            filter,
            indexFrom,
            count,
            sorter
        }, context, option);


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

        return rows;
    }
}