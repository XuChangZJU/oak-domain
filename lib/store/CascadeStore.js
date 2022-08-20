"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeStore = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var RowStore_1 = require("../types/RowStore");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
/**这个用来处理级联的select和update，对不同能力的 */
var CascadeStore = /** @class */ (function (_super) {
    tslib_1.__extends(CascadeStore, _super);
    function CascadeStore(storageSchema) {
        return _super.call(this, storageSchema) || this;
    }
    CascadeStore.prototype.cascadeSelect = function (entity, selection, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var data, projection, oneToMany, oneToManyOnEntity, manyToOne, manyToOneOnEntity, supportMtoJoin, attr, relation, _a, entity2, foreignKey, rows;
            var _b, _c, _d, _e, _f, _g, _h, _j;
            var _this = this;
            return tslib_1.__generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        data = selection.data;
                        projection = {};
                        oneToMany = {};
                        oneToManyOnEntity = {};
                        manyToOne = {};
                        manyToOneOnEntity = {};
                        supportMtoJoin = this.supportManyToOneJoin();
                        for (attr in data) {
                            relation = (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
                            if (relation === 1 || relation == 0) {
                                Object.assign(projection, (_b = {},
                                    _b[attr] = data[attr],
                                    _b));
                            }
                            else if (relation === 2) {
                                // 基于entity的多对一
                                Object.assign(projection, {
                                    entity: 1,
                                    entityId: 1,
                                });
                                if (supportMtoJoin) {
                                    Object.assign(projection, (_c = {},
                                        _c[attr] = data[attr],
                                        _c));
                                }
                                else {
                                    Object.assign(manyToOneOnEntity, (_d = {},
                                        _d[attr] = 1,
                                        _d));
                                }
                            }
                            else if (typeof relation === 'string') {
                                // 基于属性的多对一
                                if (supportMtoJoin) {
                                    Object.assign(projection, (_e = {},
                                        _e[attr] = data[attr],
                                        _e));
                                }
                                else {
                                    Object.assign(projection, (_f = {},
                                        _f["".concat(attr, "Id")] = 1,
                                        _f));
                                    Object.assign(manyToOne, (_g = {},
                                        _g[attr] = relation,
                                        _g));
                                }
                            }
                            else {
                                _a = tslib_1.__read(relation, 2), entity2 = _a[0], foreignKey = _a[1];
                                if (foreignKey) {
                                    // 基于属性的一对多
                                    Object.assign(oneToMany, (_h = {},
                                        _h[attr] = {
                                            entity: entity2,
                                            foreignKey: foreignKey,
                                        },
                                        _h));
                                }
                                else {
                                    // 基于entity的多对一
                                    Object.assign(oneToManyOnEntity, (_j = {},
                                        _j[attr] = entity2,
                                        _j));
                                }
                            }
                        }
                        return [4 /*yield*/, this.selectAbjointRow(entity, Object.assign({}, selection, {
                                data: projection,
                            }), context, option)];
                    case 1:
                        rows = _k.sent();
                        return [4 /*yield*/, Promise.all(
                            // manyToOne
                            (function () {
                                var attrs = Object.keys(manyToOne);
                                if (attrs.length > 0) {
                                    return attrs.map(function (attr) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                        var subRows;
                                        return tslib_1.__generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, this.cascadeSelect(manyToOne[attr], {
                                                        data: data[attr],
                                                        filter: {
                                                            id: {
                                                                $in: rows.map(function (row) { return row["".concat(attr, "Id")]; })
                                                            },
                                                        }
                                                    }, context, option)];
                                                case 1:
                                                    subRows = _a.sent();
                                                    rows.forEach(function (row) {
                                                        var _a;
                                                        var subRow = subRows.find(function (ele) { return ele.id === row["".concat(attr, "Id")]; });
                                                        Object.assign(row, (_a = {},
                                                            _a[attr] = subRow,
                                                            _a));
                                                    });
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                }
                                return [];
                            })().concat(
                            // manyToOneOnEntity
                            (function () {
                                var attrs = Object.keys(manyToOneOnEntity);
                                if (attrs.length > 0) {
                                    return attrs.map(function (attr) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                        var subRows;
                                        return tslib_1.__generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, this.cascadeSelect(attr, {
                                                        data: data[attr],
                                                        filter: {
                                                            id: {
                                                                $in: rows.filter(function (row) { return row.entity === attr; }).map(function (row) { return row.entityId; })
                                                            },
                                                        }
                                                    }, context, option)];
                                                case 1:
                                                    subRows = _a.sent();
                                                    rows.filter(function (row) { return row.entity === attr; }).forEach(function (row) {
                                                        var _a;
                                                        var subRow = subRows.find(function (ele) { return ele.id === row.entityId; });
                                                        Object.assign(row, (_a = {},
                                                            _a[attr] = subRow,
                                                            _a));
                                                    });
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                }
                                return [];
                            })()).concat((function () {
                                var attrs = Object.keys(oneToMany);
                                if (attrs.length > 0) {
                                    // 必须一行一行的查询，否则indexFrom和count无法准确
                                    return rows.map(function (row) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                        var _a, _b, _i, attr, _c, entity2, foreignKey, filter2, rows2;
                                        var _d, _e;
                                        return tslib_1.__generator(this, function (_f) {
                                            switch (_f.label) {
                                                case 0:
                                                    _a = [];
                                                    for (_b in oneToMany)
                                                        _a.push(_b);
                                                    _i = 0;
                                                    _f.label = 1;
                                                case 1:
                                                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                                                    attr = _a[_i];
                                                    _c = oneToMany[attr], entity2 = _c.entity, foreignKey = _c.foreignKey;
                                                    filter2 = data[attr];
                                                    return [4 /*yield*/, this.cascadeSelect(entity2, Object.assign({}, filter2, {
                                                            filter: (0, filter_1.addFilterSegment)((_d = {},
                                                                _d[foreignKey] = row.id,
                                                                _d), filter2.filter),
                                                        }), context, option)];
                                                case 2:
                                                    rows2 = _f.sent();
                                                    Object.assign(row, (_e = {},
                                                        _e[attr] = rows2,
                                                        _e));
                                                    _f.label = 3;
                                                case 3:
                                                    _i++;
                                                    return [3 /*break*/, 1];
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                }
                                return [];
                            })()).concat((function () {
                                var attrs = Object.keys(oneToManyOnEntity);
                                if (attrs.length > 0) {
                                    // 必须一行一行的查询，否则indexFrom和count无法准确
                                    return rows.map(function (row) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                        var _a, _b, _i, attr, filter2, rows2;
                                        var _c;
                                        return tslib_1.__generator(this, function (_d) {
                                            switch (_d.label) {
                                                case 0:
                                                    _a = [];
                                                    for (_b in oneToManyOnEntity)
                                                        _a.push(_b);
                                                    _i = 0;
                                                    _d.label = 1;
                                                case 1:
                                                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                                                    attr = _a[_i];
                                                    filter2 = data[attr];
                                                    return [4 /*yield*/, this.cascadeSelect(oneToManyOnEntity[attr], Object.assign({}, filter2, {
                                                            filter: (0, filter_1.addFilterSegment)({
                                                                entityId: row.id,
                                                                entity: entity,
                                                            }, filter2.filter),
                                                        }), context, option)];
                                                case 2:
                                                    rows2 = _d.sent();
                                                    Object.assign(row, (_c = {},
                                                        _c[attr] = rows2,
                                                        _c));
                                                    _d.label = 3;
                                                case 3:
                                                    _i++;
                                                    return [3 /*break*/, 1];
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                }
                                return [];
                            })()))];
                    case 2:
                        _k.sent();
                        return [2 /*return*/, rows];
                }
            });
        });
    };
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
     * @param option
     */
    CascadeStore.prototype.cascadeUpdate = function (entity, operation, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, data, filter, id, opData, result, multipleCreate, data_1, data_1_1, dataEle, result2, e_1_1, data2, _loop_1, this_1, _a, _b, _i, attr, operation2, count;
            var e_1, _c, _d, _e;
            var _this = this;
            return tslib_1.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        action = operation.action, data = operation.data, filter = operation.filter, id = operation.id;
                        opData = {};
                        result = {};
                        if (!(action === 'create' && data instanceof Array)) return [3 /*break*/, 9];
                        multipleCreate = this.supportMultipleCreate();
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 6, 7, 8]);
                        data_1 = tslib_1.__values(data), data_1_1 = data_1.next();
                        _f.label = 2;
                    case 2:
                        if (!!data_1_1.done) return [3 /*break*/, 5];
                        dataEle = data_1_1.value;
                        return [4 /*yield*/, this.cascadeUpdate(entity, {
                                id: id,
                                action: action,
                                data: dataEle,
                            }, context, option)];
                    case 3:
                        result2 = _f.sent();
                        this.mergeOperationResult(result, result2);
                        _f.label = 4;
                    case 4:
                        data_1_1 = data_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_1_1 = _f.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (data_1_1 && !data_1_1.done && (_c = data_1.return)) _c.call(data_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/, result];
                    case 9:
                        data2 = data;
                        _loop_1 = function (attr) {
                            var relation, operationMto, actionMto, dataMto, filterMto, fkId, entity_1, result2, operationMto, actionMto, dataMto, filterMto, _g, _h, fkId, result2, _j, entityOtm_1, foreignKey_1, otmOperations, dealWithOneToMany, otmOperations_1, otmOperations_1_1, oper, e_2_1;
                            var _k, _l, _m, e_2, _o;
                            return tslib_1.__generator(this, function (_p) {
                                switch (_p.label) {
                                    case 0:
                                        relation = (0, relation_1.judgeRelation)(this_1.storageSchema, entity, attr);
                                        if (!(relation === 1)) return [3 /*break*/, 1];
                                        Object.assign(opData, (_k = {},
                                            _k[attr] = data2[attr],
                                            _k));
                                        return [3 /*break*/, 16];
                                    case 1:
                                        if (!(relation === 2)) return [3 /*break*/, 3];
                                        operationMto = data2[attr];
                                        actionMto = operationMto.action, dataMto = operationMto.data, filterMto = operationMto.filter;
                                        if (actionMto === 'create') {
                                            Object.assign(opData, {
                                                entityId: dataMto.id,
                                                entity: attr,
                                            });
                                        }
                                        else if (action === 'create') {
                                            fkId = data2.entityId, entity_1 = data2.entity;
                                            (0, assert_1.default)(typeof fkId === 'string' || entity_1 === attr); // A中data的entityId作为B中filter的主键
                                            Object.assign(operationMto, {
                                                filter: (0, filter_1.addFilterSegment)({
                                                    id: fkId,
                                                }),
                                                filterMto: filterMto,
                                            });
                                        }
                                        else {
                                            // 剩下三种情况都是B中的filter的id来自A中row的entityId
                                            (0, assert_1.default)(!data2.hasOwnProperty('entityId') && !data2.hasOwnProperty('entity'));
                                            Object.assign(operationMto, {
                                                filter: (0, filter_1.addFilterSegment)({
                                                    id: {
                                                        $in: {
                                                            entity: entity,
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
                                        return [4 /*yield*/, this_1.cascadeUpdate(attr, operationMto, context, option)];
                                    case 2:
                                        result2 = _p.sent();
                                        this_1.mergeOperationResult(result, result2);
                                        return [3 /*break*/, 16];
                                    case 3:
                                        if (!(typeof relation === 'string')) return [3 /*break*/, 5];
                                        operationMto = data2[attr];
                                        actionMto = operationMto.action, dataMto = operationMto.data, filterMto = operationMto.filter;
                                        if (actionMto === 'create') {
                                            Object.assign(opData, (_l = {},
                                                _l["".concat(attr, "Id")] = dataMto.id,
                                                _l));
                                        }
                                        else if (action === 'create') {
                                            _g = data2, _h = "".concat(attr, "Id"), fkId = _g[_h];
                                            (0, assert_1.default)(typeof fkId === 'string');
                                            Object.assign(operationMto, {
                                                filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                                                    id: fkId,
                                                }),
                                            });
                                        }
                                        else {
                                            (0, assert_1.default)(!data2.hasOwnProperty("".concat(attr, "Id")));
                                            Object.assign(operationMto, {
                                                filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                                                    id: {
                                                        $in: {
                                                            entity: entity,
                                                            data: (_m = {},
                                                                _m["".concat(attr, "Id")] = 1,
                                                                _m),
                                                            filter: filter,
                                                        }
                                                    },
                                                }),
                                            });
                                        }
                                        return [4 /*yield*/, this_1.cascadeUpdate(relation, operationMto, context, option)];
                                    case 4:
                                        result2 = _p.sent();
                                        this_1.mergeOperationResult(result, result2);
                                        return [3 /*break*/, 16];
                                    case 5:
                                        (0, assert_1.default)(relation instanceof Array);
                                        _j = tslib_1.__read(relation, 2), entityOtm_1 = _j[0], foreignKey_1 = _j[1];
                                        otmOperations = data2[attr];
                                        dealWithOneToMany = function (otm) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                            var actionOtm, dataOtm, filterOtm, id_1, id_2, id_3, id_4, id_5, id_6, result2;
                                            var _a, _b, _c, _d;
                                            return tslib_1.__generator(this, function (_e) {
                                                switch (_e.label) {
                                                    case 0:
                                                        actionOtm = otm.action, dataOtm = otm.data, filterOtm = otm.filter;
                                                        if (!foreignKey_1) {
                                                            // 基于entity/entityId的one-to-many
                                                            if (action === 'create') {
                                                                id_1 = data2.id;
                                                                if (dataOtm instanceof Array) {
                                                                    dataOtm.forEach(function (ele) { return Object.assign(ele, {
                                                                        entity: entity,
                                                                        entityId: id_1,
                                                                    }); });
                                                                }
                                                                else {
                                                                    Object.assign(dataOtm, {
                                                                        entity: entity,
                                                                        entityId: id_1,
                                                                    });
                                                                }
                                                            }
                                                            else if (actionOtm === 'create') {
                                                                id_2 = filter.id;
                                                                (0, assert_1.default)(typeof id_2 === 'string');
                                                                if (dataOtm instanceof Array) {
                                                                    dataOtm.forEach(function (ele) { return Object.assign(ele, {
                                                                        entity: entity,
                                                                        entityId: id_2,
                                                                    }); });
                                                                }
                                                                else {
                                                                    Object.assign(dataOtm, {
                                                                        entity: entity,
                                                                        entityId: id_2,
                                                                    });
                                                                }
                                                            }
                                                            else {
                                                                id_3 = filter.id;
                                                                Object.assign(otm, {
                                                                    filter: (0, filter_1.addFilterSegment)({
                                                                        entity: entity,
                                                                        entityId: id_3,
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
                                                                id_4 = data2.id;
                                                                if (dataOtm instanceof Array) {
                                                                    dataOtm.forEach(function (ele) {
                                                                        var _a;
                                                                        return Object.assign(ele, (_a = {},
                                                                            _a[foreignKey_1] = id_4,
                                                                            _a));
                                                                    });
                                                                }
                                                                else {
                                                                    Object.assign(dataOtm, (_a = {},
                                                                        _a[foreignKey_1] = id_4,
                                                                        _a));
                                                                }
                                                            }
                                                            else if (actionOtm === 'create') {
                                                                id_5 = filter.id;
                                                                (0, assert_1.default)(typeof id_5 === 'string');
                                                                if (dataOtm instanceof Array) {
                                                                    dataOtm.forEach(function (ele) {
                                                                        var _a;
                                                                        return Object.assign(ele, (_a = {},
                                                                            _a[foreignKey_1] = id_5,
                                                                            _a));
                                                                    });
                                                                }
                                                                else {
                                                                    Object.assign(dataOtm, (_b = {},
                                                                        _b[foreignKey_1] = id_5,
                                                                        _b));
                                                                }
                                                            }
                                                            else {
                                                                id_6 = filter.id;
                                                                Object.assign(otm, {
                                                                    filter: (0, filter_1.addFilterSegment)((_c = {},
                                                                        _c[foreignKey_1] = id_6,
                                                                        _c), filterOtm),
                                                                });
                                                                if (action === 'remove' && actionOtm === 'update') {
                                                                    Object.assign(dataOtm, (_d = {},
                                                                        _d[foreignKey_1] = null,
                                                                        _d));
                                                                }
                                                            }
                                                        }
                                                        return [4 /*yield*/, this.cascadeUpdate(entityOtm_1, otm, context, option)];
                                                    case 1:
                                                        result2 = _e.sent();
                                                        this.mergeOperationResult(result, result2);
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); };
                                        if (!(otmOperations instanceof Array)) return [3 /*break*/, 14];
                                        _p.label = 6;
                                    case 6:
                                        _p.trys.push([6, 11, 12, 13]);
                                        otmOperations_1 = (e_2 = void 0, tslib_1.__values(otmOperations)), otmOperations_1_1 = otmOperations_1.next();
                                        _p.label = 7;
                                    case 7:
                                        if (!!otmOperations_1_1.done) return [3 /*break*/, 10];
                                        oper = otmOperations_1_1.value;
                                        return [4 /*yield*/, dealWithOneToMany(oper)];
                                    case 8:
                                        _p.sent();
                                        _p.label = 9;
                                    case 9:
                                        otmOperations_1_1 = otmOperations_1.next();
                                        return [3 /*break*/, 7];
                                    case 10: return [3 /*break*/, 13];
                                    case 11:
                                        e_2_1 = _p.sent();
                                        e_2 = { error: e_2_1 };
                                        return [3 /*break*/, 13];
                                    case 12:
                                        try {
                                            if (otmOperations_1_1 && !otmOperations_1_1.done && (_o = otmOperations_1.return)) _o.call(otmOperations_1);
                                        }
                                        finally { if (e_2) throw e_2.error; }
                                        return [7 /*endfinally*/];
                                    case 13: return [3 /*break*/, 16];
                                    case 14: return [4 /*yield*/, dealWithOneToMany(otmOperations)];
                                    case 15:
                                        _p.sent();
                                        _p.label = 16;
                                    case 16: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a = [];
                        for (_b in data2)
                            _a.push(_b);
                        _i = 0;
                        _f.label = 10;
                    case 10:
                        if (!(_i < _a.length)) return [3 /*break*/, 13];
                        attr = _a[_i];
                        return [5 /*yield**/, _loop_1(attr)];
                    case 11:
                        _f.sent();
                        _f.label = 12;
                    case 12:
                        _i++;
                        return [3 /*break*/, 10];
                    case 13:
                        operation2 = Object.assign({}, operation, {
                            data: opData,
                        });
                        return [4 /*yield*/, this.updateAbjointRow(entity, operation2, context, option)];
                    case 14:
                        count = _f.sent();
                        this.mergeOperationResult(result, (_d = {},
                            _d[entity] = (_e = {},
                                _e[operation2.action] = count,
                                _e),
                            _d));
                        return [2 /*return*/, result];
                }
            });
        });
    };
    CascadeStore.prototype.judgeRelation = function (entity, attr) {
        return (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
    };
    return CascadeStore;
}(RowStore_1.RowStore));
exports.CascadeStore = CascadeStore;
