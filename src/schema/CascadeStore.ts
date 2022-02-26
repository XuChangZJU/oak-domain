import assert from "assert";
import { assign } from "lodash";
import { Context } from '../types/Context';
import { DeduceCreateOperation, DeduceCreateSingleOperation, DeduceFilter, DeduceRemoveOperation, DeduceSelection, DeduceUpdateOperation, EntityDef, EntityShape, SelectionResult } from "../types/Entity";
import { RowStore } from '../types/RowStore';
import { StorageSchema } from '../types/Storage';
import { addFilterSegment } from "./filter";
import { judgeRelation } from "./relation";

/**这个用来处理级联的select和update，对不同能力的 */
export abstract class CascadeStore<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends EntityShape = EntityShape> extends RowStore<E, ED, SH> {
    constructor(storageSchema: StorageSchema) {
        super(storageSchema);
    }
    protected abstract selectAbjointRow<T extends E>(
        entity: T,
        selection: Omit<ED[T]['Selection'], 'indexFrom' | 'count' | 'data' | 'sorter'>,
        context: Context<E, ED, SH>,
        params?: Object): Promise<SelectionResult<E, ED, T, SH>>;

    protected abstract updateAbjointRow<T extends E>(
        entity: T,
        operation: DeduceCreateSingleOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH>,
        context: Context<E, ED, SH>,
        params?: Object): Promise<void>;

    protected async cascadeSelect<T extends E>(
        entity: T,
        selection: ED[T]['Selection'],
        context: Context<E, ED, SH>, params?: Object): Promise<SelectionResult<E, ED, T, SH>> {
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
                const [ row2 ] = await this.cascadeSelect(manyToOne[attr] as E, {
                    data: data[attr] as any,
                    filter: {
                        id: (row as any)[`${attr}Id`],
                    }
                }, context, params);
                assign(row, {
                    [attr]: row2,
                });
            }
            for (const attr in manyToOneOnEntity) {
                if ((row as any).entity === attr) {
                    const [ row2 ] = await this.cascadeSelect(attr as E, {
                        data: data[attr] as any,
                        filter: {
                            id: (row as any)[`entityId`],
                        }
                    }, context, params);
                    assign(row, {
                        [attr]: row2,
                    });
                }
            }
            for (const attr in oneToMany) {
                const { entity: entity2, foreignKey } = oneToMany[attr];
                const filter2 = data[attr] as DeduceSelection<E, ED, E, SH>;
                const rows2 = await this.cascadeSelect(entity2 as E, assign({}, filter2, {
                    filter: addFilterSegment({
                        [`${foreignKey}Id`]: row.id,
                    } as any, filter2.filter),
                }), context, params);
                assign(row, {
                    [attr]: rows2,
                });
            }
            for (const attr in oneToManyOnEntity) {
                const filter2 = data[attr] as DeduceSelection<E, ED, E, SH>;
                const rows2 = await this.cascadeSelect(oneToManyOnEntity[attr] as E, assign({}, filter2, {
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
    protected async cascadeUpdate<T extends E>(
        entity: T,
        operation: DeduceCreateOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH>,
        context: Context<E, ED, SH>,
        params?: Object): Promise<void> {
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

        const data2 = data as (DeduceCreateSingleOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH>)['data'];
        for (const attr in data2) {
            const relation = judgeRelation(this.storageSchema, entity, attr);
            if (relation === 1) {
                assign(opData, {
                    [attr]: data2[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity/entityId的many-to-one
                const operationMto = data2[attr] as DeduceCreateSingleOperation<E, ED, E, SH> | DeduceUpdateOperation<E, ED, E, SH> | DeduceRemoveOperation<E, ED, E, SH>;
                const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                if (actionMto === 'create') {
                    assign(opData, {
                        entityId: dataMto.id,
                        entity: attr,
                    });
                }
                else if (action === 'create') {
                    const { entityId: fkId } = data2;
                    assert(typeof fkId === 'string');
                    assign(operationMto, {
                        filter: addFilterSegment({
                            id: fkId,
                        } as DeduceFilter<E, ED, E, SH>), filterMto,
                    });
                    assign(opData, {
                        entity: attr,
                    });
                }
                else {
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
                        } as DeduceFilter<E, ED, E, SH>, filterMto),
                    });
                }

                await this.cascadeUpdate(attr as E, operationMto, context, params);
            }
            else if (typeof relation === 'string') {
                // 基于attr的外键的many-to-one
                const operationMto = data2[attr] as DeduceCreateSingleOperation<E, ED, E, SH> | DeduceUpdateOperation<E, ED, E, SH> | DeduceRemoveOperation<E, ED, E, SH>;
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
                        } as DeduceFilter<E, ED, E, SH>),
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
                        } as unknown as DeduceFilter<E, ED, E, SH>),
                    });
                }

                await this.cascadeUpdate(relation as E, operationMto, context, params);
            }
            else {
                const operationOtm = data2[attr] as DeduceCreateOperation<E, ED, E, SH> | DeduceUpdateOperation<E, ED, E, SH> | DeduceRemoveOperation<E, ED, E, SH>;
                const { action: actionOtm, data: dataOtm, filter: filterOtm } = operationOtm;
                assert(relation instanceof Array);
                const [entityOtm, foreignKey] = relation;
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
                        // 这里先假设filter上一定有id，复杂的情况后面再处理
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
                        assign(operationOtm, {
                            filter: addFilterSegment({
                                entity,
                                entityId: {
                                    $in: {
                                        entity,
                                        data: {
                                            id: 1,
                                        },
                                        filter,
                                    }
                                }
                            } as DeduceFilter<E, ED, E, SH>, filterOtm),
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
                                    [`${foreignKey}Id`]: id,
                                })
                            );
                        }
                        else {
                            assign(dataOtm, {
                                [`${foreignKey}Id`]: id,
                            });
                        }
                    }
                    else if (actionOtm === 'create') {
                        // 这里先假设filter上一定有id，复杂的情况后面再处理
                        const { id } = filter!;
                        assert(typeof id === 'string');
                        if (dataOtm instanceof Array) {
                            dataOtm.forEach(
                                ele => assign(ele, {
                                    [`${foreignKey}Id`]: id,
                                })
                            );
                        }
                        else {
                            assign(dataOtm, {
                                [`${foreignKey}Id`]: id,
                            });
                        }
                    }
                    else {
                        assign(operationOtm, {
                            filter: addFilterSegment({
                                [`${foreignKey}Id`]: {
                                    $in: {
                                        entity,
                                        data: {
                                            id: 1,
                                        },
                                        filter,
                                    }
                                }
                            } as unknown as DeduceFilter<E, ED, E, SH>, filterOtm),
                        });
                        if (action === 'remove' && actionOtm === 'update') {
                            assign(dataOtm, {
                                [`${foreignKey}Id`]: null,
                            });
                        }
                    }
                }

                await this.cascadeUpdate(entityOtm! as E, operationOtm, context, params);
            }
        }

        const operation2: DeduceCreateSingleOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH> =
            assign({}, operation as DeduceCreateSingleOperation<E, ED, T, SH> | DeduceUpdateOperation<E, ED, T, SH> | DeduceRemoveOperation<E, ED, T, SH>, {
                data: opData as ED[T]['OpSchema'],
            });

        await this.updateAbjointRow(entity, operation2, context, params);
    }
}