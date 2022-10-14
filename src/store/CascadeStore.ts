import assert from "assert";
import { Context } from '../types/Context';
import {
    DeduceCreateSingleOperation, DeduceRemoveOperation, DeduceUpdateOperation, EntityDict,
    OperateOption, SelectOption, OperationResult, SelectRowShape, DeduceFilter, DeduceSelection
} from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { addFilterSegment, combineFilters, getRelevantIds } from "./filter";
import { judgeRelation } from "./relation";
import { CreateOperation as CreateOperOperation } from '../base-app-domain/Oper/Schema';
import { CreateOperation as CreateModiOperation, UpdateOperation as UpdateModiOperation } from '../base-app-domain/Modi/Schema';
import { OakCongruentRowExists, OakRowUnexistedException } from "../types";
import { omit, cloneDeep, uniq } from '../utils/lodash';
import { result } from "lodash";

/**这个用来处理级联的select和update，对不同能力的 */
export abstract class CascadeStore<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>> extends RowStore<ED, Cxt> {
    constructor(storageSchema: StorageSchema<ED>) {
        super(storageSchema);
    }
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract supportMultipleCreate(): boolean;
    protected abstract selectAbjointRow<T extends keyof ED, S extends ED[T]['Selection'], OP extends SelectOption>(
        entity: T,
        selection: S,
        context: Cxt,
        option: OP): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]>;

    protected abstract updateAbjointRow<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'],
        context: Cxt,
        option: OP): Promise<number>;


    /**
     * 将一次查询的结果集加入result
     * @param entity 
     * @param rows 
     * @param context 
     */
    private addToResultSelections<T extends keyof ED, S extends ED[T]['Selection']['data']>(entity: T, rows: Array<SelectRowShape<ED[T]['Schema'], S>>, context: Cxt) {
        const { opRecords } = context;

        let lastOperation = opRecords[opRecords.length - 1];
        if (lastOperation && lastOperation.a === 's') {
            const entityBranch = lastOperation.d[entity];
            if (entityBranch) {
                rows.forEach(
                    (row) => {
                        const { id } = row as { id: string };
                        if (!entityBranch![id!]) {
                            Object.assign(entityBranch!, {
                                [id!]: cloneDeep(row),
                            });
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
                const { id } = row as { id: string };
                Object.assign(entityBranch!, {
                    [id!]: cloneDeep(row),
                });
            }
        );
        Object.assign(lastOperation.d, {
            [entity]: entityBranch,
        });
    }

    private reduceDescendants<T extends keyof ED, S extends ED[T]['Selection']>(entity: T, rows: SelectRowShape<ED[T]['Schema'], S['data']>[]) {
        return rows.filter(ele => !!ele).map(
            (row) => {
                const row2 = {} as typeof row;
                for (const attr in row) {
                    const rel = this.judgeRelation(entity, attr);
                    if (typeof rel === 'number' && [0, 1].includes(rel)) {
                        Object.assign(row2, {
                            [attr]: row[attr],
                        });
                    }
                }
                return row2;
            }
        );
    }

    private destructCascadeSelect<T extends keyof ED, S extends ED[T]['Selection'], OP extends SelectOption>(
        entity: T, projection2: S['data'], context: Cxt, option: OP) {
        const projection: ED[T]['Selection']['data'] = {};
        const cascadeSelectionFns: Array<(result: SelectRowShape<ED[T]['Schema'], S['data']>[]) => Promise<void>> = [];

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
                        async (result) => {
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
                            if (!option.dontCollect) {
                                this.addToResultSelections(attr, this.reduceDescendants(attr, result.map(ele => ele[attr] as any)), context);
                            }
                        }
                    );
                    const {
                        projection: subProjection,
                        cascadeSelectionFns: subCascadeSelectionFns,
                    } = this.destructCascadeSelect(attr, projection2[attr], context, option);
                    Object.assign(projection, {
                        [attr]: subProjection,
                    });
                    subCascadeSelectionFns.forEach(
                        ele => cascadeSelectionFns.push(
                            async (result) => {
                                await ele(result.map(ele2 => ele2[attr] as any));
                            }
                        )
                    );
                }
                else {
                    cascadeSelectionFns.push(
                        async (result) => {
                            const entityIds = uniq(result.filter(
                                ele => ele.entity === attr
                            ).map(
                                ele => ele.entityId
                            ) as string[]);

                            const subRows = await this.cascadeSelect(attr, {
                                data: projection2[attr],
                                filter: {
                                    id: {
                                        $in: entityIds
                                    },
                                } as any,
                            }, context, option);
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
                                    }
                                }
                            );
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
                            async (result) => {
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
                                if (!option.dontCollect) {
                                    this.addToResultSelections(relation, this.reduceDescendants(relation, result.map(ele => ele[attr] as any)), context);
                                }
                            }
                        );
                    }
                    const {
                        projection: subProjection,
                        cascadeSelectionFns: subCascadeSelectionFns,
                    } = this.destructCascadeSelect(relation, projection2[attr], context, option);
                    Object.assign(projection, {
                        [attr]: subProjection,
                    });
                    subCascadeSelectionFns.forEach(
                        ele => cascadeSelectionFns.push(
                            async (result) => {
                                await ele(result.map(ele2 => ele2[attr] as any));
                            }
                        )
                    );
                }
                else {
                    cascadeSelectionFns.push(
                        async (result) => {
                            const ids = uniq(result.filter(
                                ele => !!(ele[`${attr}Id`])
                            ).map(
                                ele => ele[`${attr}Id`]
                            ) as string[]);

                            const subRows = await this.cascadeSelect(relation, {
                                data: projection2[attr],
                                filter: {
                                    id: {
                                        $in: ids
                                    },
                                } as any,
                            }, context, option);
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
                                    }
                                }
                            );
                        }
                    );
                }
            }
            else {
                assert(relation instanceof Array);
                const { data: subProjection, filter: subFilter, indexFrom, count, sorter: subSorter } = projection2[attr];
                const [entity2, foreignKey] = relation;
                if (foreignKey) {
                    // 基于属性的一对多
                    cascadeSelectionFns.push(
                        async (result) => {
                            const ids = result.map(
                                ele => ele.id
                            ) as string[];

                            const subRows = await this.cascadeSelect(entity2, {
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
                        }
                    );
                }
                else {
                    // 基于entity的多对一
                    cascadeSelectionFns.push(
                        async (result) => {
                            const ids = result.map(
                                ele => ele.id
                            ) as string[];

                            const subRows = await this.cascadeSelect(entity2, {
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
                        }
                    );
                }
            }
        }

        return {
            projection,
            cascadeSelectionFns,
        }
    }

    protected async cascadeSelect<T extends keyof ED, S extends ED[T]['Selection'], OP extends SelectOption>(
        entity: T,
        selection: S,
        context: Cxt,
        option: OP): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]> {
        const { data, filter, indexFrom, count, sorter } = selection;
        const { projection, cascadeSelectionFns } = await this.destructCascadeSelect(entity, data, context, option);

        const rows = await this.selectAbjointRow(entity, {
            data: projection,
            filter,
            indexFrom,
            count,
            sorter
        }, context, option);


        if (!option.dontCollect) {
            this.addToResultSelections(entity, this.supportMultipleCreate() ? this.reduceDescendants(entity, rows) : rows, context);
        }

        if (cascadeSelectionFns.length > 0) {
            const ruException: Array<{
                entity: keyof ED,
                selection: DeduceSelection<ED[keyof ED]['Schema']>
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

    protected async cascadeSelect2<T extends keyof ED, S extends ED[T]['Selection'], OP extends SelectOption>(
        entity: T,
        selection: S,
        context: Cxt,
        option: OP): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]> {
        const { data, filter } = selection;

        const projection: ED[T]['Selection']['data'] = {};
        const oneToMany: any = {};
        const oneToManyOnEntity: any = {};
        const manyToOne: any = {};
        const manyToOneOnEntity: any = {};

        const supportMtoJoin = this.supportManyToOneJoin();
        for (const attr in data) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
                Object.assign(projection, {
                    [attr]: data[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity的多对一
                Object.assign(projection, {
                    entity: 1,
                    entityId: 1,
                });
                if (supportMtoJoin) {
                    Object.assign(projection, {
                        [attr]: data[attr],
                    });
                }
                else {
                    Object.assign(manyToOneOnEntity, {
                        [attr]: 1,
                    });
                }
            }
            else if (typeof relation === 'string') {
                // 基于属性的多对一
                if (supportMtoJoin) {
                    Object.assign(projection, {
                        [attr]: data[attr],
                    });
                }
                else {
                    Object.assign(projection, {
                        [`${attr}Id`]: 1,
                    });
                    Object.assign(manyToOne, {
                        [attr]: relation,
                    });
                }
            }
            else {
                const [entity2, foreignKey] = relation;
                if (foreignKey) {
                    // 基于属性的一对多
                    Object.assign(oneToMany, {
                        [attr]: {
                            entity: entity2,
                            foreignKey,
                        },
                    });
                }
                else {
                    // 基于entity的多对一
                    Object.assign(oneToManyOnEntity, {
                        [attr]: entity2,
                    });
                }
            }
        }

        const rows = await this.selectAbjointRow<T, S, OP>(entity, Object.assign({}, selection, {
            data: projection,
        }), context, option);

        if (!option.dontCollect) {
            this.addToResultSelections(entity, rows, context);
        }

        await Promise.all(
            // manyToOne
            (() => {
                const attrs = Object.keys(manyToOne);
                if (attrs.length > 0) {
                    return attrs.map(
                        async (attr) => {
                            const subRows = await this.cascadeSelect(manyToOne[attr] as keyof ED, {
                                data: data[attr],
                                filter: {
                                    id: {
                                        $in: rows.map(
                                            (row) => (row as Record<string, any>)[`${attr}Id`]
                                        )
                                    },
                                } as any
                            }, context, option);

                            rows.forEach(
                                (row) => {
                                    const subRow = subRows.find(
                                        ele => (ele as Record<string, any>).id === (row as Record<string, any>)[`${attr}Id`]
                                    );
                                    Object.assign(row, {
                                        [attr]: subRow,
                                    });
                                }
                            )
                        }
                    );
                }
                return [];
            })().concat(
                // manyToOneOnEntity
                (() => {
                    const attrs = Object.keys(manyToOneOnEntity);
                    if (attrs.length > 0) {
                        return attrs.map(
                            async (attr) => {
                                const subRows = await this.cascadeSelect(attr as keyof ED, {
                                    data: data[attr],
                                    filter: {
                                        id: {
                                            $in: rows.filter(
                                                row => (row as Record<string, any>).entity === attr
                                            ).map(
                                                row => (row as Record<string, any>).entityId
                                            )
                                        },
                                    } as any
                                }, context, option);

                                rows.filter(
                                    row => (row as Record<string, any>).entity === attr
                                ).forEach(
                                    (row) => {
                                        const subRow = subRows.find(
                                            ele => (ele as Record<string, any>).id === (row as Record<string, any>).entityId
                                        );
                                        Object.assign(row, {
                                            [attr]: subRow,
                                        });
                                    }
                                )
                            }
                        );
                    }
                    return [];
                })()
            ).concat(
                (() => {
                    const attrs = Object.keys(oneToMany);
                    if (attrs.length > 0) {
                        // 必须一行一行的查询，否则indexFrom和count无法准确
                        return rows.map(
                            async (row) => {
                                for (const attr in oneToMany) {
                                    const { entity: entity2, foreignKey } = oneToMany[attr];
                                    const filter2 = data[attr];
                                    const rows2 = await this.cascadeSelect(entity2, Object.assign({}, filter2, {
                                        filter: addFilterSegment({
                                            [foreignKey]: (row as Record<string, any>).id,
                                        } as any, filter2.filter),
                                    }), context, option);
                                    Object.assign(row, {
                                        [attr]: rows2,
                                    });
                                }
                            }
                        );
                    }
                    return [];
                })()
            ).concat(
                (() => {
                    const attrs = Object.keys(oneToManyOnEntity);
                    if (attrs.length > 0) {
                        // 必须一行一行的查询，否则indexFrom和count无法准确
                        return rows.map(
                            async (row) => {
                                for (const attr in oneToManyOnEntity) {
                                    const filter2 = data[attr];
                                    const rows2 = await this.cascadeSelect(oneToManyOnEntity[attr], Object.assign({}, filter2, {
                                        filter: addFilterSegment({
                                            entityId: (row as Record<string, any>).id,
                                            entity,
                                        } as any, filter2.filter),
                                    }), context, option);
                                    Object.assign(row, {
                                        [attr]: rows2,
                                    });
                                }
                            }
                        );
                    }
                    return [];
                })()
            )
        );

        return rows;
    }

    private async destructCascadeUpdate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        action: ED[T]['Action'],
        data: ED[T]['CreateSingle']['data'] | ED[T]['Update']['data'] | ED[T]['Remove']['data'],
        context: Cxt,
        option: OP,
        result: OperationResult<ED>,
        filter?: DeduceFilter<ED[T]['Schema']>
    ) {
        const modiAttr = this.getSchema()[entity].toModi;
        const option2 = Object.assign({}, option);

        const opData: Record<string, any> = {};
        if (modiAttr && action !== 'remove') {
            // create/update具有modi对象的对象，对其子对象的update行为全部是create modi对象（缓存动作）
            // delete此对象，所有的modi子对象应该通过触发器作废，这个通过系统的trigger来搞
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

                const result2 = await this.cascadeUpdate(attr, operationMto, context, option2);
                this.mergeOperationResult(result, result2);
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

                const result2 = await this.cascadeUpdate(relation, operationMto, context, option2);
                this.mergeOperationResult(result, result2);
            }
            else {
                assert(relation instanceof Array);
                const [entityOtm, foreignKey] = relation;
                const otmOperations = data[attr];
                const dealWithOneToMany = async (otm: DeduceUpdateOperation<ED[keyof ED]['Schema']>) => {
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
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter!;
                            Object.assign(otm, {
                                filter: addFilterSegment({
                                    entity,
                                    entityId: id,
                                }, filterOtm),
                            });
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
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter!;
                            Object.assign(otm, {
                                filter: addFilterSegment({
                                    [foreignKey]: id,
                                }, filterOtm),
                            });
                            if (action === 'remove' && actionOtm === 'update') {
                                Object.assign(dataOtm, {
                                    [foreignKey]: null,
                                });
                            }
                        }
                    }

                    const result2 = await this.cascadeUpdate(entityOtm!, otm, context, option2);
                    this.mergeOperationResult(result, result2);
                };

                if (otmOperations instanceof Array) {
                    for (const oper of otmOperations) {
                        await dealWithOneToMany(oper);
                    }
                }
                else {
                    await dealWithOneToMany(otmOperations);
                }
            }
        }

        return opData;
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
     * @param operation 
     * @param context 
     * @param option 
     */
    protected async cascadeUpdate<T extends keyof ED, OP extends OperateOption>(
        entity: T,
        operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'],
        context: Cxt,
        option: OP): Promise<OperationResult<ED>> {
        const { action, data, filter, id } = operation;
        let opData: any;
        const result: OperationResult<ED> = {};

        if (['create', 'create-l'].includes(action) && data instanceof Array) {
            opData = [];
            for (const d of data) {
                const od = await this.destructCascadeUpdate(
                    entity,
                    action,
                    d,
                    context,
                    option,
                    result,
                );
                opData.push(od);
            }
        }
        else {
            opData = await this.destructCascadeUpdate(
                entity,
                action,
                data,
                context,
                option,
                result,
                filter
            );
        }

        const operation2: DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']> =
            Object.assign({}, operation as DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>, {
                data: opData as ED[T]['OpSchema'],
            });

        const count = await this.doUpdateSingleRow(entity, operation2, context, option);
        this.mergeOperationResult(result, {
            [entity]: {
                [operation2.action]: count,
            }
        } as OperationResult<ED>);
        return result;
    }

    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity 
     * @param operation 
     * @param context 
     * @param option 
     */
    private async doUpdateSingleRow<T extends keyof ED, OP extends OperateOption>(entity: T,
        operation: ED[T]['Create'] | ED[T]['Update'] | ED[T]['Remove'],
        context: Cxt,
        option: OP
    ) {
        const { data, action, id: operId, filter } = operation;
        const now = Date.now();

        switch (action) {
            case 'create': {
                if (option.modiParentEntity && !['modi', 'modiEntity', 'oper', 'operEntity'].includes(entity as string)) {
                    // 变成对modi的插入
                    const modiCreate: CreateModiOperation = {
                        id: 'dummy',
                        action: 'create',
                        data: {
                            id: operId,
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
                    await this.cascadeUpdate('modi', modiCreate, context, option);
                    return 1;
                }
                else {
                    const addTimestamp = (data2: ED[T]['CreateSingle']['data']) => {
                        Object.assign(data2, {
                            $$createAt$$: now,
                            $$updateAt$$: now,
                        });
                    };
                    if (data instanceof Array) {
                        data.forEach(
                            ele => addTimestamp(ele)
                        );
                    }
                    else {
                        addTimestamp(<ED[T]['CreateSingle']['data']>data);
                    }
                    let result: number;
                    const createInner = async (operation2: ED[T]['Create']) => {
                        try {
                            result = await this.updateAbjointRow(
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
                        const createOper: CreateOperOperation = {
                            id: 'dummy',
                            action: 'create',
                            data: {
                                id: operId,
                                action,
                                data,
                                operatorId: await context.getCurrentUserId(),
                                operEntity$oper: data instanceof Array ? {
                                    id: 'dummy',
                                    action: 'create',
                                    data: await Promise.all(
                                        data.map(
                                            async (ele) => ({
                                                id: await generateNewId(),
                                                entity: entity as string,
                                                entityId: ele.id,
                                            })
                                        )
                                    ),
                                } : [{
                                    id: 'dummy',
                                    action: 'create',
                                    data: {
                                        id: await generateNewId(),
                                        entity: entity as string,
                                        entityId: (data as ED[T]['CreateSingle']['data']).id,
                                    },
                                }]
                            },
                        };
                        await this.cascadeUpdate('oper', createOper, context, {
                            dontCollect: true,
                            dontCreateOper: true,
                        });
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
                    const rows = await this.selectAbjointRow(entity, selection, context, {
                        dontCollect: true,
                    });
                    ids.push(...(rows.map(ele => ele.id! as string)));
                }

                if (option.modiParentEntity && !['modi', 'modiEntity'].includes(entity as string)) {
                    // 延时更新，变成对modi的插入
                    // 变成对modi的插入
                    // 优化，这里如果是对同一个targetEntity反复update，则变成对最后一条create/update的modi进行update，以避免发布文章这样的需求时产生过多的modi
                    let modiUpsert: CreateModiOperation | UpdateModiOperation | undefined;
                    if (action !== 'remove') {
                        const upsertModis = await this.selectAbjointRow('modi', {
                            data: {
                                id: 1,
                                data: 1,
                            },
                            filter: {
                                targetEntity: entity as string,
                                action: {
                                    $in: ['create', 'update'],
                                },
                                iState: 'active',
                                filter: {
                                    id: {
                                        $in: ids,
                                    },
                                }
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
                                filter: {
                                    id: {
                                        $in: ids,
                                    },
                                },
                                modiEntity$modi: {
                                    id: 'dummy',
                                    action: 'create',
                                    data: await Promise.all(
                                        ids.map(
                                            async (id) => ({
                                                id: await generateNewId(),
                                                entity: entity as string,
                                                entityId: id,
                                            })
                                        )
                                    ),
                                },
                            },
                        };
                    }
                    await this.cascadeUpdate('modi', modiUpsert!, context, option);
                    return 1;
                }
                else {
                    const createOper = async () => {
                        if (!option?.dontCreateOper && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity as string) && ids.length > 0) {
                            // 按照框架要求生成Oper和OperEntity这两个内置的对象
                            assert(operId);
                            const createOper: CreateOperOperation = {
                                id: 'dummy',
                                action: 'create',
                                data: {
                                    id: operId,
                                    action,
                                    data,
                                    operEntity$oper: {
                                        id: 'dummy',
                                        action: 'create',
                                        data: await Promise.all(
                                            ids.map(
                                                async (ele) => ({
                                                    id: await generateNewId(),
                                                    entity: entity as string,
                                                    entityId: ele,
                                                })
                                            )
                                        )
                                    },
                                },
                            }
                            await this.cascadeUpdate('oper', createOper, context, {
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
                                } as DeduceFilter<ED[T]['Schema']>,
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
                                    } as DeduceFilter<ED[T]['Schema']>,
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

                    const result = await this.updateAbjointRow(entity, operation, context, option);
                    await createOper();

                    return result;
                }
            }
        }
    }

    judgeRelation(entity: keyof ED, attr: string) {
        return judgeRelation(this.storageSchema, entity, attr);
    }
}