import assert from "assert";
import { assign, keys } from "lodash";
import { Context } from '../types/Context';
import {
    DeduceCreateOperation, DeduceCreateSingleOperation, DeduceFilter, DeduceRemoveOperation, DeduceSelection,
    DeduceUpdateOperation, EntityDict, EntityShape, OperateParams, OperationResult, SelectionResult, SelectRowShape
} from "../types/Entity";
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { addFilterSegment } from "./filter";
import { judgeRelation } from "./relation";

/**这个用来处理级联的select和update，对不同能力的 */
export abstract class CascadeStore<ED extends EntityDict, Cxt extends Context<ED>> extends RowStore<ED, Cxt> {
    constructor(storageSchema: StorageSchema<ED>) {
        super(storageSchema);
    }
    protected abstract supportManyToOneJoin(): boolean;
    protected abstract selectAbjointRow<T extends keyof ED, S extends ED[T]['Selection']>(
        entity: T,
        selection: S,
        context: Cxt,
        params?: OperateParams): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]>;

    protected abstract updateAbjointRow<T extends keyof ED>(
        entity: T,
        operation: DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>,
        context: Cxt,
        params?: OperateParams): Promise<number>;

    protected async cascadeSelect<T extends keyof ED, S extends ED[T]['Selection']>(
        entity: T,
        selection: S,
        context: Cxt, params?: OperateParams): Promise<SelectRowShape<ED[T]['Schema'], S['data']>[]> {
        const { data } = selection;

        const projection: ED[T]['Selection']['data'] = {};
        const oneToMany: any = {};
        const oneToManyOnEntity: any = {};
        const manyToOne: any = {};
        const manyToOneOnEntity: any = {};

        const supportMtoJoin = this.supportManyToOneJoin();
        for (const attr in data) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
                assign(projection, {
                    [attr]: data[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity的多对一
                assign(projection, {
                    entity: 1,
                    entityId: 1,
                });
                if (supportMtoJoin) {
                    assign(projection, {
                        [attr]: data[attr],
                    });
                }
                else {
                    assign(manyToOneOnEntity, {
                        [attr]: 1,
                    });
                }
            }
            else if (typeof relation === 'string') {
                // 基于属性的多对一
                if (supportMtoJoin) {
                    assign(projection, {
                        [attr]: data[attr],
                    });
                }
                else {
                    assign(projection, {
                        [`${attr}Id`]: 1,
                    });
                    assign(manyToOne, {
                        [attr]: relation,
                    });
                }
            }
            else {
                const [entity2, foreignKey] = relation;
                if (foreignKey) {
                    // 基于属性的一对多
                    assign(oneToMany, {
                        [attr]: {
                            entity: entity2,
                            foreignKey,
                        },
                    });
                }
                else {
                    // 基于entity的多对一
                    assign(oneToManyOnEntity, {
                        [attr]: entity2,
                    });
                }
            }
        }

        const rows = await this.selectAbjointRow(entity, assign({}, selection, {
            data: projection,
        }), context, params);

        await Promise.all(
            // manyToOne
            (() => {
                const attrs = keys(manyToOne);
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
                            }, context, params);

                            rows.forEach(
                                (row) => {
                                    const subRow = subRows.find(
                                        ele => (ele as Record<string, any>).id === (row as Record<string, any>)[`${attr}Id`]
                                    );
                                    assign(row, {
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
                    const attrs = keys(manyToOneOnEntity);
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
                                }, context, params);

                                rows.filter(
                                    row => (row as Record<string, any>).entity === attr
                                ).forEach(
                                    (row) => {
                                        const subRow = subRows.find(
                                            ele => (ele as Record<string, any>).id === (row as Record<string, any>).entityId
                                        );
                                        assign(row, {
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
                    const attrs = keys(oneToMany);
                    if (attrs.length > 0) {
                        // 必须一行一行的查询，否则indexFrom和count无法准确
                        return rows.map(
                            async (row) => {
                                for (const attr in oneToMany) {
                                    const { entity: entity2, foreignKey } = oneToMany[attr];
                                    const filter2 = data[attr];
                                    const rows2 = await this.cascadeSelect(entity2, assign({}, filter2, {
                                        filter: addFilterSegment({
                                            [foreignKey]: (row as Record<string, any>).id,
                                        } as any, filter2.filter),
                                    }), context, params);
                                    assign(row, {
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
                    const attrs = keys(oneToManyOnEntity);
                    if (attrs.length > 0) {
                        // 必须一行一行的查询，否则indexFrom和count无法准确
                        return rows.map(
                            async (row) => {
                                for (const attr in oneToManyOnEntity) {
                                    const filter2 = data[attr];
                                    const rows2 = await this.cascadeSelect(oneToManyOnEntity[attr], assign({}, filter2, {
                                        filter: addFilterSegment({
                                            entityId: (row as Record<string, any>).id,
                                            entity,
                                        } as any, filter2.filter),
                                    }), context, params);
                                    assign(row, {
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
     * @param entity 
     * @param operation 
     * @param context 
     * @param params 
     */
    protected async cascadeUpdate<T extends keyof ED>(
        entity: T,
        operation: DeduceCreateOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>,
        context: Cxt,
        params?: OperateParams): Promise<OperationResult<ED>> {
        const { action, data, filter } = operation;
        const opData = {};
        const result: OperationResult<ED> = {};

        if (action === 'create' && data instanceof Array) {
            for (const dataEle of data) {
                const result2 = await this.cascadeUpdate(entity, {
                    action,
                    data: dataEle,
                }, context, params);
                this.mergeOperationResult(result, result2);
            }
            return result;
        }

        const data2 = data as (DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>)['data'];
        for (const attr in data2) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
            if (relation === 1) {
                assign(opData, {
                    [attr]: data2[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity/entityId的many-to-one
                const operationMto = data2[attr];
                const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                if (actionMto === 'create') {
                    assign(opData, {
                        entityId: dataMto.id,
                        entity: attr,
                    });
                }
                else if (action === 'create') {
                    const { entityId: fkId, entity } = data2;
                    assert(typeof fkId === 'string' || entity === attr);        // A中data的entityId作为B中filter的主键
                    assign(operationMto, {
                        filter: addFilterSegment({
                            id: fkId,
                        }), filterMto,
                    });
                }
                else {
                    // 剩下三种情况都是B中的filter的id来自A中row的entityId
                    assert(!data2.hasOwnProperty('entityId') && !data2.hasOwnProperty('entity'));
                    assign(operationMto, {
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

                const result2 = await this.cascadeUpdate(attr, operationMto, context, params);
                this.mergeOperationResult(result, result2);
            }
            else if (typeof relation === 'string') {
                // 基于attr的外键的many-to-one
                const operationMto = data2[attr];
                const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                if (actionMto === 'create') {
                    assign(opData, {
                        [`${attr}Id`]: dataMto.id,
                    });
                }
                else if (action === 'create') {
                    const { [`${attr}Id`]: fkId } = data2;
                    assert(typeof fkId === 'string');
                    assign(operationMto, {
                        filter: addFilterSegment(filterMto || {}, {
                            id: fkId,
                        }),
                    });
                }
                else {
                    assert(!data2.hasOwnProperty(`${attr}Id`));
                    assign(operationMto, {
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

                const result2 = await this.cascadeUpdate(relation, operationMto, context, params);
                this.mergeOperationResult(result, result2);
            }
            else {
                assert(relation instanceof Array);
                const [entityOtm, foreignKey] = relation;
                const otmOperations = data2[attr];
                const dealWithOneToMany = async (otm: DeduceUpdateOperation<ED[keyof ED]['Schema']>) => {
                    const { action: actionOtm, data: dataOtm, filter: filterOtm } = otm;
                    if (!foreignKey) {
                        // 基于entity/entityId的one-to-many
                        if (action === 'create') {
                            const { id } = data2;
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(
                                    ele => assign(ele, {
                                        entity,
                                        entityId: id,
                                    })
                                );
                            }
                            else {
                                assign(dataOtm, {
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
                                    ele => assign(ele, {
                                        entity,
                                        entityId: id,
                                    })
                                );
                            }
                            else {
                                assign(dataOtm, {
                                    entity,
                                    entityId: id,
                                });
                            }
                        }
                        else {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter!;
                            assign(otm, {
                                filter: addFilterSegment({
                                    entity,
                                    entityId: id,
                                }, filterOtm),
                            });
                            if (action === 'remove' && actionOtm === 'update') {
                                assign(dataOtm, {
                                    entity: null,
                                    entityId: null,
                                });
                            }
                        }
                    }
                    else {
                        // 基于foreignKey的one-to-many
                        if (action === 'create') {
                            const { id } = data2;
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(
                                    ele => assign(ele, {
                                        [foreignKey]: id,
                                    })
                                );
                            }
                            else {
                                assign(dataOtm, {
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
                                    ele => assign(ele, {
                                        [foreignKey]: id,
                                    })
                                );
                            }
                            else {
                                assign(dataOtm, {
                                    [foreignKey]: id,
                                });
                            }
                        }
                        else {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter!;
                            assign(otm, {
                                filter: addFilterSegment({
                                    [foreignKey]: id,
                                }, filterOtm),
                            });
                            if (action === 'remove' && actionOtm === 'update') {
                                assign(dataOtm, {
                                    [foreignKey]: null,
                                });
                            }
                        }
                    }

                    const result2 = await this.cascadeUpdate(entityOtm!, otm, context, params);
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

        const operation2: DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']> =
            assign({}, operation as DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>, {
                data: opData as ED[T]['OpSchema'],
            });

        const count = await this.updateAbjointRow(entity, operation2, context, params);
        this.mergeOperationResult(result, {
            [entity]: {
                [operation2.action]: count,
            }
        } as OperationResult<ED>);
        return result;
    }

    judgeRelation(entity: keyof ED, attr: string) {
        return judgeRelation(this.storageSchema, entity, attr);
    }
}