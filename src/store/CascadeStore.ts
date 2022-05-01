import assert from "assert";
import { assign } from "lodash";
import { Context } from '../types/Context';
import { DeduceCreateOperation, DeduceCreateSingleOperation, DeduceFilter, DeduceRemoveOperation, DeduceSelection,
     DeduceUpdateOperation, EntityDict, EntityShape, OperateParams, SelectionResult } from "../types/Entity";
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { addFilterSegment } from "./filter";
import { judgeRelation } from "./relation";

/**这个用来处理级联的select和update，对不同能力的 */
export abstract class CascadeStore<ED extends EntityDict, Cxt extends Context<ED>> extends RowStore<ED, Cxt> {
    constructor(storageSchema: StorageSchema<ED>) {
        super(storageSchema);
    }
    protected abstract selectAbjointRow<T extends keyof ED>(
        entity: T,
        selection: Omit<ED[T]['Selection'], 'indexFrom' | 'count' | 'data' | 'sorter'>,
        context: Cxt,
        params?: OperateParams): Promise<Array<ED[T]['OpSchema']>>;

    protected abstract updateAbjointRow<T extends keyof ED>(
        entity: T,
        operation: DeduceCreateSingleOperation<ED[T]['Schema']> | DeduceUpdateOperation<ED[T]['Schema']> | DeduceRemoveOperation<ED[T]['Schema']>,
        context: Cxt,
        params?: OperateParams): Promise<void>;

    protected async cascadeSelect<T extends keyof ED>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Cxt, params?: OperateParams): Promise<Array<ED[T]['Schema']>> {
        const { data } = selection;

        const projection: ED[T]['Selection']['data'] = {};
        const oneToMany:any = {};
        const oneToManyOnEntity:any = {};
        const manyToOne:any = {};
        const manyToOneOnEntity:any = {};
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
                assign(manyToOneOnEntity, {
                    [attr]: 1,
                });
            }
            else if (typeof relation === 'string') {
                // 基于属性的多对一
                assign(projection, {
                    [`${attr}Id`]: 1,
                });
                assign(manyToOne, {
                    [attr]: relation,
                });
            }
            else {
                const [ entity2, foreignKey ] = relation;
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

        const rows = await this.selectAbjointRow(entity, selection, context, params);

        for (const row of rows) {
            for (const attr in manyToOne) {
                const row2 = await this.cascadeSelect(manyToOne[attr], {
                    data: data[attr],                    
                    filter: {                        
                        id: row[`${attr}Id`] as string,
                    } as any
                }, context, params);
                assign(row, {
                    [attr]: row2[0],
                });
            }
            for (const attr in manyToOneOnEntity) {
                if (row.entity === attr) {
                    const row2 = await this.cascadeSelect(attr, {
                        data: data[attr],
                        filter: {
                            id: row[`entityId`],
                        } as any
                    }, context, params);
                    assign(row, {
                        [attr]: row2[0],
                    });
                }
            }
            for (const attr in oneToMany) {
                const { entity: entity2, foreignKey } = oneToMany[attr];
                const filter2 = data[attr];
                const rows2 = await this.cascadeSelect(entity2, assign({}, filter2, {
                    filter: addFilterSegment({
                        [foreignKey]: row.id,
                    } as any, filter2.filter),
                }), context, params);
                assign(row, {
                    [attr]: rows2,
                });
            }
            for (const attr in oneToManyOnEntity) {
                const filter2 = data[attr];
                const rows2 = await this.cascadeSelect(oneToManyOnEntity[attr], assign({}, filter2, {
                    filter: addFilterSegment({
                        entityId: row.id,
                        entity,
                    } as any, filter2.filter),
                }), context, params);
                assign(row, {
                    [attr]: rows2,
                });
            }
        }

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
        params?: OperateParams): Promise<void> {
        const { action, data, filter } = operation;
        const opData = {};

        if (action === 'create' && data instanceof Array) {
            for (const dataEle of data) {
                await this.cascadeUpdate(entity, {
                    action,
                    data: dataEle,
                }, context, params);
            }
            return;
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

                await this.cascadeUpdate(attr, operationMto, context, params);
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

                await this.cascadeUpdate(relation, operationMto, context, params);
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
    
                    await this.cascadeUpdate(entityOtm!, otm, context, params);
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

        await this.updateAbjointRow(entity, operation2, context, params);
    }
    
    judgeRelation(entity: keyof ED, attr: string) {
        return judgeRelation(this.storageSchema, entity, attr);
    }
}