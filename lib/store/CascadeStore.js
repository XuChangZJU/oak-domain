"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeStore = void 0;
const assert_1 = __importDefault(require("assert"));
const lodash_1 = require("lodash");
const RowStore_1 = require("../types/RowStore");
const filter_1 = require("./filter");
const relation_1 = require("./relation");
/**这个用来处理级联的select和update，对不同能力的 */
class CascadeStore extends RowStore_1.RowStore {
    constructor(storageSchema) {
        super(storageSchema);
    }
    async cascadeSelect(entity, selection, context, params) {
        const { data } = selection;
        const projection = {};
        const oneToMany = {};
        const oneToManyOnEntity = {};
        const manyToOne = {};
        const manyToOneOnEntity = {};
        const supportMtoJoin = this.supportManyToOneJoin();
        for (const attr in data) {
            const relation = (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
                (0, lodash_1.assign)(projection, {
                    [`${attr}Id`]: 1,
                });
                (0, lodash_1.assign)(projection, {
                    [attr]: data[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity的多对一
                (0, lodash_1.assign)(projection, {
                    entity: 1,
                    entityId: 1,
                });
                if (supportMtoJoin) {
                    (0, lodash_1.assign)(projection, {
                        [attr]: data[attr],
                    });
                }
                else {
                    (0, lodash_1.assign)(manyToOneOnEntity, {
                        [attr]: 1,
                    });
                }
            }
            else if (typeof relation === 'string') {
                // 基于属性的多对一
                if (supportMtoJoin) {
                    (0, lodash_1.assign)(projection, {
                        [attr]: data[attr],
                    });
                }
                else {
                    (0, lodash_1.assign)(projection, {
                        [`${attr}Id`]: 1,
                    });
                    (0, lodash_1.assign)(manyToOne, {
                        [attr]: relation,
                    });
                }
            }
            else {
                const [entity2, foreignKey] = relation;
                if (foreignKey) {
                    // 基于属性的一对多
                    (0, lodash_1.assign)(oneToMany, {
                        [attr]: {
                            entity: entity2,
                            foreignKey,
                        },
                    });
                }
                else {
                    // 基于entity的多对一
                    (0, lodash_1.assign)(oneToManyOnEntity, {
                        [attr]: entity2,
                    });
                }
            }
        }
        const rows = await this.selectAbjointRow(entity, selection, context, params);
        await Promise.all(
        // manyToOne
        (() => {
            const attrs = (0, lodash_1.keys)(manyToOne);
            if (attrs.length > 0) {
                return attrs.map(async (attr) => {
                    const subRows = await this.cascadeSelect(manyToOne[attr], {
                        data: data[attr],
                        filter: {
                            id: {
                                $in: rows.map((row) => row[`${attr}Id`])
                            },
                        }
                    }, context, params);
                    rows.forEach((row) => {
                        const subRow = subRows.find(ele => ele.id === row[`${attr}Id`]);
                        (0, lodash_1.assign)(row, {
                            [attr]: subRow,
                        });
                    });
                });
            }
            return [];
        })().concat(
        // manyToOneOnEntity
        (() => {
            const attrs = (0, lodash_1.keys)(manyToOneOnEntity);
            if (attrs.length > 0) {
                return attrs.map(async (attr) => {
                    const subRows = await this.cascadeSelect(attr, {
                        data: data[attr],
                        filter: {
                            id: {
                                $in: rows.filter(row => row.entity === attr).map(row => row.entityId)
                            },
                        }
                    }, context, params);
                    rows.filter(row => row.entity === attr).forEach((row) => {
                        const subRow = subRows.find(ele => ele.id === row.entityId);
                        (0, lodash_1.assign)(row, {
                            [attr]: subRow,
                        });
                    });
                });
            }
            return [];
        })()).concat((() => {
            const attrs = (0, lodash_1.keys)(oneToMany);
            if (attrs.length > 0) {
                // 必须一行一行的查询，否则indexFrom和count无法准确
                return rows.map(async (row) => {
                    for (const attr in oneToMany) {
                        const { entity: entity2, foreignKey } = oneToMany[attr];
                        const filter2 = data[attr];
                        const rows2 = await this.cascadeSelect(entity2, (0, lodash_1.assign)({}, filter2, {
                            filter: (0, filter_1.addFilterSegment)({
                                [foreignKey]: row.id,
                            }, filter2.filter),
                        }), context, params);
                        (0, lodash_1.assign)(row, {
                            [attr]: rows2,
                        });
                    }
                });
            }
            return [];
        })()).concat((() => {
            const attrs = (0, lodash_1.keys)(oneToManyOnEntity);
            if (attrs.length > 0) {
                // 必须一行一行的查询，否则indexFrom和count无法准确
                return rows.map(async (row) => {
                    for (const attr in oneToManyOnEntity) {
                        const filter2 = data[attr];
                        const rows2 = await this.cascadeSelect(oneToManyOnEntity[attr], (0, lodash_1.assign)({}, filter2, {
                            filter: (0, filter_1.addFilterSegment)({
                                entityId: row.id,
                                entity,
                            }, filter2.filter),
                        }), context, params);
                        (0, lodash_1.assign)(row, {
                            [attr]: rows2,
                        });
                    }
                });
            }
            return [];
        })()));
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
    async cascadeUpdate(entity, operation, context, params) {
        const { action, data, filter } = operation;
        const opData = {};
        const result = {};
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
        const data2 = data;
        for (const attr in data2) {
            const relation = (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
            if (relation === 1) {
                (0, lodash_1.assign)(opData, {
                    [attr]: data2[attr],
                });
            }
            else if (relation === 2) {
                // 基于entity/entityId的many-to-one
                const operationMto = data2[attr];
                const { action: actionMto, data: dataMto, filter: filterMto } = operationMto;
                if (actionMto === 'create') {
                    (0, lodash_1.assign)(opData, {
                        entityId: dataMto.id,
                        entity: attr,
                    });
                }
                else if (action === 'create') {
                    const { entityId: fkId, entity } = data2;
                    (0, assert_1.default)(typeof fkId === 'string' || entity === attr); // A中data的entityId作为B中filter的主键
                    (0, lodash_1.assign)(operationMto, {
                        filter: (0, filter_1.addFilterSegment)({
                            id: fkId,
                        }), filterMto,
                    });
                }
                else {
                    // 剩下三种情况都是B中的filter的id来自A中row的entityId
                    (0, assert_1.default)(!data2.hasOwnProperty('entityId') && !data2.hasOwnProperty('entity'));
                    (0, lodash_1.assign)(operationMto, {
                        filter: (0, filter_1.addFilterSegment)({
                            id: {
                                $in: {
                                    entity,
                                    data: {
                                        entityId: 1,
                                    },
                                    filter: (0, filter_1.addFilterSegment)({
                                        entity: attr,
                                    }, filter),
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
                    (0, lodash_1.assign)(opData, {
                        [`${attr}Id`]: dataMto.id,
                    });
                }
                else if (action === 'create') {
                    const { [`${attr}Id`]: fkId } = data2;
                    (0, assert_1.default)(typeof fkId === 'string');
                    (0, lodash_1.assign)(operationMto, {
                        filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                            id: fkId,
                        }),
                    });
                }
                else {
                    (0, assert_1.default)(!data2.hasOwnProperty(`${attr}Id`));
                    (0, lodash_1.assign)(operationMto, {
                        filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
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
                (0, assert_1.default)(relation instanceof Array);
                const [entityOtm, foreignKey] = relation;
                const otmOperations = data2[attr];
                const dealWithOneToMany = async (otm) => {
                    const { action: actionOtm, data: dataOtm, filter: filterOtm } = otm;
                    if (!foreignKey) {
                        // 基于entity/entityId的one-to-many
                        if (action === 'create') {
                            const { id } = data2;
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => (0, lodash_1.assign)(ele, {
                                    entity,
                                    entityId: id,
                                }));
                            }
                            else {
                                (0, lodash_1.assign)(dataOtm, {
                                    entity,
                                    entityId: id,
                                });
                            }
                        }
                        else if (actionOtm === 'create') {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter;
                            (0, assert_1.default)(typeof id === 'string');
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => (0, lodash_1.assign)(ele, {
                                    entity,
                                    entityId: id,
                                }));
                            }
                            else {
                                (0, lodash_1.assign)(dataOtm, {
                                    entity,
                                    entityId: id,
                                });
                            }
                        }
                        else {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter;
                            (0, lodash_1.assign)(otm, {
                                filter: (0, filter_1.addFilterSegment)({
                                    entity,
                                    entityId: id,
                                }, filterOtm),
                            });
                            if (action === 'remove' && actionOtm === 'update') {
                                (0, lodash_1.assign)(dataOtm, {
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
                                dataOtm.forEach(ele => (0, lodash_1.assign)(ele, {
                                    [foreignKey]: id,
                                }));
                            }
                            else {
                                (0, lodash_1.assign)(dataOtm, {
                                    [foreignKey]: id,
                                });
                            }
                        }
                        else if (actionOtm === 'create') {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter;
                            (0, assert_1.default)(typeof id === 'string');
                            if (dataOtm instanceof Array) {
                                dataOtm.forEach(ele => (0, lodash_1.assign)(ele, {
                                    [foreignKey]: id,
                                }));
                            }
                            else {
                                (0, lodash_1.assign)(dataOtm, {
                                    [foreignKey]: id,
                                });
                            }
                        }
                        else {
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            const { id } = filter;
                            (0, lodash_1.assign)(otm, {
                                filter: (0, filter_1.addFilterSegment)({
                                    [foreignKey]: id,
                                }, filterOtm),
                            });
                            if (action === 'remove' && actionOtm === 'update') {
                                (0, lodash_1.assign)(dataOtm, {
                                    [foreignKey]: null,
                                });
                            }
                        }
                    }
                    const result2 = await this.cascadeUpdate(entityOtm, otm, context, params);
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
        const operation2 = (0, lodash_1.assign)({}, operation, {
            data: opData,
        });
        const count = await this.updateAbjointRow(entity, operation2, context, params);
        this.mergeOperationResult(result, {
            [entity]: {
                [operation2.action]: count,
            }
        });
        return result;
    }
    judgeRelation(entity, attr) {
        return (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
    }
}
exports.CascadeStore = CascadeStore;
