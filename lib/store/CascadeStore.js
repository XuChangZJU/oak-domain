"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeStore = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var RowStore_1 = require("../types/RowStore");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var types_1 = require("../types");
var lodash_1 = require("../utils/lodash");
/**这个用来处理级联的select和update，对不同能力的 */
var CascadeStore = /** @class */ (function (_super) {
    tslib_1.__extends(CascadeStore, _super);
    function CascadeStore(storageSchema) {
        return _super.call(this, storageSchema) || this;
    }
    /**
     * 将一次查询的结果集加入result
     * @param entity
     * @param rows
     * @param context
     */
    CascadeStore.prototype.addToResultSelections = function (entity, rows, context) {
        var _a;
        var opRecords = context.opRecords;
        var lastOperation = opRecords[opRecords.length - 1];
        if (lastOperation && lastOperation.a === 's') {
            var entityBranch_1 = lastOperation.d[entity];
            if (entityBranch_1) {
                rows.forEach(function (row) {
                    var _a;
                    var id = row.id;
                    if (!entityBranch_1[id]) {
                        Object.assign(entityBranch_1, (_a = {},
                            _a[id] = (0, lodash_1.cloneDeep)(row),
                            _a));
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
        var entityBranch = {};
        rows.forEach(function (row) {
            var _a;
            var id = row.id;
            Object.assign(entityBranch, (_a = {},
                _a[id] = (0, lodash_1.cloneDeep)(row),
                _a));
        });
        Object.assign(lastOperation.d, (_a = {},
            _a[entity] = entityBranch,
            _a));
    };
    CascadeStore.prototype.reduceDescendants = function (entity, rows) {
        var _this = this;
        return rows.map(function (row) {
            var _a;
            var row2 = {};
            for (var attr in row) {
                var rel = _this.judgeRelation(entity, attr);
                if (typeof rel === 'number' && [0, 1].includes(rel)) {
                    Object.assign(row2, (_a = {},
                        _a[attr] = row[attr],
                        _a));
                }
            }
            return row2;
        });
    };
    CascadeStore.prototype.destructCascadeSelect = function (entity, projection2, context, option) {
        var _this = this;
        var projection = {};
        var cascadeSelectionFns = [];
        var supportMtoJoin = this.supportManyToOneJoin();
        var toModi = this.getSchema()[entity].toModi;
        var _loop_1 = function (attr) {
            var _a, _b, _c, _d;
            var relation = (0, relation_1.judgeRelation)(this_1.storageSchema, entity, attr);
            if (relation === 1 || relation == 0) {
                Object.assign(projection, (_a = {},
                    _a[attr] = projection2[attr],
                    _a));
            }
            else if (relation === 2) {
                // 基于entity/entityId的多对一
                Object.assign(projection, {
                    entity: 1,
                    entityId: 1,
                });
                if (supportMtoJoin) {
                    cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        return tslib_1.__generator(this, function (_a) {
                            if (!toModi) {
                                result.forEach(function (ele) {
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
                            if (!option.dontCollect) {
                                this.addToResultSelections(attr, this.reduceDescendants(attr, result.map(function (ele) { return ele[attr]; })), context);
                            }
                            return [2 /*return*/];
                        });
                    }); });
                    var _e = this_1.destructCascadeSelect(attr, projection2[attr], context, option), subProjection = _e.projection, subCascadeSelectionFns = _e.cascadeSelectionFns;
                    Object.assign(projection, (_b = {},
                        _b[attr] = subProjection,
                        _b));
                    subCascadeSelectionFns.forEach(function (ele) { return cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, ele(result.map(function (ele2) { return ele2[attr]; }))];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }); });
                }
                else {
                    cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var entityIds, subRows;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    entityIds = (0, lodash_1.uniq)(result.filter(function (ele) { return ele.entity === attr; }).map(function (ele) { return ele.entityId; }));
                                    return [4 /*yield*/, this.cascadeSelect(attr, {
                                            data: projection2[attr],
                                            filter: {
                                                id: {
                                                    $in: entityIds
                                                },
                                            },
                                        }, context, option)];
                                case 1:
                                    subRows = _a.sent();
                                    (0, assert_1.default)(subRows.length <= entityIds.length);
                                    if (subRows.length < entityIds.length && !toModi) {
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
                                    result.forEach(function (ele) {
                                        var _a;
                                        if (ele.entity === attr) {
                                            var subRow = subRows.find(function (ele2) { return ele2.id === ele.entityId; });
                                            if (subRow) {
                                                Object.assign(ele, (_a = {},
                                                    _a[attr] = subRow,
                                                    _a));
                                            }
                                        }
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
            }
            else if (typeof relation === 'string') {
                Object.assign(projection, (_c = {},
                    _c["".concat(attr, "Id")] = 1,
                    _c));
                if (supportMtoJoin) {
                    if (!toModi) {
                        // 如果不是modi，要保证外键没有空指针
                        cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            return tslib_1.__generator(this, function (_a) {
                                if (!toModi) {
                                    result.forEach(function (ele) {
                                        if (ele["".concat(attr, "Id")] && !ele[attr]) {
                                            throw new types_1.OakRowUnexistedException([{
                                                    entity: relation,
                                                    selection: {
                                                        data: projection2[attr],
                                                        filter: {
                                                            id: ele["".concat(attr, "Id")],
                                                        }
                                                    }
                                                }]);
                                        }
                                    });
                                }
                                if (!option.dontCollect) {
                                    this.addToResultSelections(relation, this.reduceDescendants(relation, result.map(function (ele) { return ele[attr]; })), context);
                                }
                                return [2 /*return*/];
                            });
                        }); });
                    }
                    var _f = this_1.destructCascadeSelect(relation, projection2[attr], context, option), subProjection = _f.projection, subCascadeSelectionFns = _f.cascadeSelectionFns;
                    Object.assign(projection, (_d = {},
                        _d[attr] = subProjection,
                        _d));
                    subCascadeSelectionFns.forEach(function (ele) { return cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, ele(result.map(function (ele2) { return ele2[attr]; }))];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }); });
                }
                else {
                    cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var ids, subRows;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    ids = (0, lodash_1.uniq)(result.filter(function (ele) { return !!(ele["".concat(attr, "Id")]); }).map(function (ele) { return ele["".concat(attr, "Id")]; }));
                                    return [4 /*yield*/, this.cascadeSelect(relation, {
                                            data: projection2[attr],
                                            filter: {
                                                id: {
                                                    $in: ids
                                                },
                                            },
                                        }, context, option)];
                                case 1:
                                    subRows = _a.sent();
                                    (0, assert_1.default)(subRows.length <= ids.length);
                                    if (subRows.length < ids.length && !toModi) {
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
                                    result.forEach(function (ele) {
                                        var _a;
                                        if (ele["".concat(attr, "Id")]) {
                                            var subRow = subRows.find(function (ele2) { return ele2.id === ele["".concat(attr, "Id")]; });
                                            if (subRow) {
                                                Object.assign(ele, (_a = {},
                                                    _a[attr] = subRow,
                                                    _a));
                                            }
                                        }
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
            }
            else {
                (0, assert_1.default)(relation instanceof Array);
                var _g = projection2[attr], subProjection_1 = _g.data, subFilter_1 = _g.filter, indexFrom_1 = _g.indexFrom, count_1 = _g.count, subSorter = _g.sorter;
                var _h = tslib_1.__read(relation, 2), entity2_1 = _h[0], foreignKey_1 = _h[1];
                if (foreignKey_1) {
                    // 基于属性的一对多
                    cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var ids, subRows;
                        var _a;
                        return tslib_1.__generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    ids = result.map(function (ele) { return ele.id; });
                                    return [4 /*yield*/, this.cascadeSelect(entity2_1, {
                                            data: subProjection_1,
                                            filter: (0, filter_1.combineFilters)([(_a = {},
                                                    _a[foreignKey_1] = {
                                                        $in: ids,
                                                    },
                                                    _a), subFilter_1]),
                                            indexFrom: indexFrom_1,
                                            count: count_1
                                        }, context, option)];
                                case 1:
                                    subRows = _b.sent();
                                    result.forEach(function (ele) {
                                        var _a;
                                        var subRowss = subRows.filter(function (ele2) { return ele2[foreignKey_1] === ele.id; });
                                        (0, assert_1.default)(subRowss);
                                        Object.assign(ele, (_a = {},
                                            _a[attr] = subRowss,
                                            _a));
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
                else {
                    // 基于entity的多对一
                    cascadeSelectionFns.push(function (result) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var ids, subRows;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    ids = result.map(function (ele) { return ele.id; });
                                    return [4 /*yield*/, this.cascadeSelect(entity2_1, {
                                            data: subProjection_1,
                                            filter: (0, filter_1.combineFilters)([{
                                                    entity: entity,
                                                    entityId: {
                                                        $in: ids,
                                                    }
                                                }, subFilter_1]),
                                            indexFrom: indexFrom_1,
                                            count: count_1
                                        }, context, option)];
                                case 1:
                                    subRows = _a.sent();
                                    result.forEach(function (ele) {
                                        var _a;
                                        var subRowss = subRows.filter(function (ele2) { return ele2.entityId === ele.id; });
                                        (0, assert_1.default)(subRowss);
                                        Object.assign(ele, (_a = {},
                                            _a[attr] = subRowss,
                                            _a));
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
            }
        };
        var this_1 = this;
        for (var attr in projection2) {
            _loop_1(attr);
        }
        return {
            projection: projection,
            cascadeSelectionFns: cascadeSelectionFns,
        };
    };
    CascadeStore.prototype.cascadeSelect = function (entity, selection, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var data, filter, indexFrom, count, sorter, _a, projection, cascadeSelectionFns, rows, ruException_1;
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = selection.data, filter = selection.filter, indexFrom = selection.indexFrom, count = selection.count, sorter = selection.sorter;
                        return [4 /*yield*/, this.destructCascadeSelect(entity, data, context, option)];
                    case 1:
                        _a = _b.sent(), projection = _a.projection, cascadeSelectionFns = _a.cascadeSelectionFns;
                        return [4 /*yield*/, this.selectAbjointRow(entity, {
                                data: projection,
                                filter: filter,
                                indexFrom: indexFrom,
                                count: count,
                                sorter: sorter
                            }, context, option)];
                    case 2:
                        rows = _b.sent();
                        if (!option.dontCollect) {
                            this.addToResultSelections(entity, this.supportMultipleCreate() ? this.reduceDescendants(entity, rows) : rows, context);
                        }
                        if (!(cascadeSelectionFns.length > 0)) return [3 /*break*/, 4];
                        ruException_1 = [];
                        return [4 /*yield*/, Promise.all(cascadeSelectionFns.map(function (ele) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var e_1, rows_1;
                                return tslib_1.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, ele(rows)];
                                        case 1:
                                            _a.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            e_1 = _a.sent();
                                            if (e_1 instanceof types_1.OakRowUnexistedException) {
                                                rows_1 = e_1.getRows();
                                                ruException_1.push.apply(ruException_1, tslib_1.__spreadArray([], tslib_1.__read(rows_1), false));
                                            }
                                            else {
                                                throw e_1;
                                            }
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 3:
                        _b.sent();
                        if (ruException_1.length > 0) {
                            throw new types_1.OakRowUnexistedException(ruException_1);
                        }
                        _b.label = 4;
                    case 4: return [2 /*return*/, rows];
                }
            });
        });
    };
    CascadeStore.prototype.cascadeSelect2 = function (entity, selection, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var data, filter, projection, oneToMany, oneToManyOnEntity, manyToOne, manyToOneOnEntity, supportMtoJoin, attr, relation, _a, entity2, foreignKey, rows;
            var _b, _c, _d, _e, _f, _g, _h, _j;
            var _this = this;
            return tslib_1.__generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        data = selection.data, filter = selection.filter;
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
                        if (!option.dontCollect) {
                            this.addToResultSelections(entity, rows, context);
                        }
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
    CascadeStore.prototype.destructCascadeUpdate = function (entity, action, data, context, option, result, filter) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var modiAttr, option2, opData, _loop_2, this_2, _a, _b, _i, attr;
            var _this = this;
            return tslib_1.__generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        modiAttr = this.getSchema()[entity].toModi;
                        option2 = Object.assign({}, option);
                        opData = {};
                        if (modiAttr && action !== 'remove') {
                            // create/update具有modi对象的对象，对其子对象的update行为全部是create modi对象（缓存动作）
                            // delete是什么情况？似乎应该先把所有的modi给abandon掉      by Xc
                            (0, assert_1.default)(!option2.modiParentId && !option2.modiParentEntity);
                            option2.modiParentId = data.id;
                            option2.modiParentEntity = entity;
                        }
                        _loop_2 = function (attr) {
                            var relation, operationMto, actionMto, dataMto, filterMto, fkId, entity_1, result2, operationMto, actionMto, dataMto, filterMto, _d, _e, fkId, result2, _f, entityOtm_1, foreignKey_2, otmOperations, dealWithOneToMany, otmOperations_1, otmOperations_1_1, oper, e_2_1;
                            var _g, _h, _j, e_2, _k;
                            return tslib_1.__generator(this, function (_l) {
                                switch (_l.label) {
                                    case 0:
                                        relation = (0, relation_1.judgeRelation)(this_2.storageSchema, entity, attr);
                                        if (!(relation === 1)) return [3 /*break*/, 1];
                                        Object.assign(opData, (_g = {},
                                            _g[attr] = data[attr],
                                            _g));
                                        return [3 /*break*/, 16];
                                    case 1:
                                        if (!(relation === 2)) return [3 /*break*/, 3];
                                        operationMto = data[attr];
                                        actionMto = operationMto.action, dataMto = operationMto.data, filterMto = operationMto.filter;
                                        if (actionMto === 'create') {
                                            Object.assign(opData, {
                                                entityId: dataMto.id,
                                                entity: attr,
                                            });
                                        }
                                        else if (action === 'create') {
                                            fkId = data.entityId, entity_1 = data.entity;
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
                                            (0, assert_1.default)(!data.hasOwnProperty('entityId') && !data.hasOwnProperty('entity'));
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
                                        return [4 /*yield*/, this_2.cascadeUpdate(attr, operationMto, context, option2)];
                                    case 2:
                                        result2 = _l.sent();
                                        this_2.mergeOperationResult(result, result2);
                                        return [3 /*break*/, 16];
                                    case 3:
                                        if (!(typeof relation === 'string')) return [3 /*break*/, 5];
                                        operationMto = data[attr];
                                        actionMto = operationMto.action, dataMto = operationMto.data, filterMto = operationMto.filter;
                                        if (actionMto === 'create') {
                                            Object.assign(opData, (_h = {},
                                                _h["".concat(attr, "Id")] = dataMto.id,
                                                _h));
                                        }
                                        else if (action === 'create') {
                                            _d = data, _e = "".concat(attr, "Id"), fkId = _d[_e];
                                            (0, assert_1.default)(typeof fkId === 'string');
                                            Object.assign(operationMto, {
                                                filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                                                    id: fkId,
                                                }),
                                            });
                                        }
                                        else {
                                            (0, assert_1.default)(!data.hasOwnProperty("".concat(attr, "Id")));
                                            Object.assign(operationMto, {
                                                filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                                                    id: {
                                                        $in: {
                                                            entity: entity,
                                                            data: (_j = {},
                                                                _j["".concat(attr, "Id")] = 1,
                                                                _j),
                                                            filter: filter,
                                                        }
                                                    },
                                                }),
                                            });
                                        }
                                        return [4 /*yield*/, this_2.cascadeUpdate(relation, operationMto, context, option2)];
                                    case 4:
                                        result2 = _l.sent();
                                        this_2.mergeOperationResult(result, result2);
                                        return [3 /*break*/, 16];
                                    case 5:
                                        (0, assert_1.default)(relation instanceof Array);
                                        _f = tslib_1.__read(relation, 2), entityOtm_1 = _f[0], foreignKey_2 = _f[1];
                                        otmOperations = data[attr];
                                        dealWithOneToMany = function (otm) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                            var actionOtm, dataOtm, filterOtm, id_1, id_2, id, id_3, id_4, id, result2;
                                            var _a, _b, _c, _d;
                                            return tslib_1.__generator(this, function (_e) {
                                                switch (_e.label) {
                                                    case 0:
                                                        actionOtm = otm.action, dataOtm = otm.data, filterOtm = otm.filter;
                                                        if (!foreignKey_2) {
                                                            // 基于entity/entityId的one-to-many
                                                            if (action === 'create') {
                                                                id_1 = data.id;
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
                                                                id = filter.id;
                                                                Object.assign(otm, {
                                                                    filter: (0, filter_1.addFilterSegment)({
                                                                        entity: entity,
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
                                                                id_3 = data.id;
                                                                if (dataOtm instanceof Array) {
                                                                    dataOtm.forEach(function (ele) {
                                                                        var _a;
                                                                        return Object.assign(ele, (_a = {},
                                                                            _a[foreignKey_2] = id_3,
                                                                            _a));
                                                                    });
                                                                }
                                                                else {
                                                                    Object.assign(dataOtm, (_a = {},
                                                                        _a[foreignKey_2] = id_3,
                                                                        _a));
                                                                }
                                                            }
                                                            else if (actionOtm === 'create') {
                                                                id_4 = filter.id;
                                                                (0, assert_1.default)(typeof id_4 === 'string');
                                                                if (dataOtm instanceof Array) {
                                                                    dataOtm.forEach(function (ele) {
                                                                        var _a;
                                                                        return Object.assign(ele, (_a = {},
                                                                            _a[foreignKey_2] = id_4,
                                                                            _a));
                                                                    });
                                                                }
                                                                else {
                                                                    Object.assign(dataOtm, (_b = {},
                                                                        _b[foreignKey_2] = id_4,
                                                                        _b));
                                                                }
                                                            }
                                                            else {
                                                                id = filter.id;
                                                                Object.assign(otm, {
                                                                    filter: (0, filter_1.addFilterSegment)((_c = {},
                                                                        _c[foreignKey_2] = id,
                                                                        _c), filterOtm),
                                                                });
                                                                if (action === 'remove' && actionOtm === 'update') {
                                                                    Object.assign(dataOtm, (_d = {},
                                                                        _d[foreignKey_2] = null,
                                                                        _d));
                                                                }
                                                            }
                                                        }
                                                        return [4 /*yield*/, this.cascadeUpdate(entityOtm_1, otm, context, option2)];
                                                    case 1:
                                                        result2 = _e.sent();
                                                        this.mergeOperationResult(result, result2);
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); };
                                        if (!(otmOperations instanceof Array)) return [3 /*break*/, 14];
                                        _l.label = 6;
                                    case 6:
                                        _l.trys.push([6, 11, 12, 13]);
                                        otmOperations_1 = (e_2 = void 0, tslib_1.__values(otmOperations)), otmOperations_1_1 = otmOperations_1.next();
                                        _l.label = 7;
                                    case 7:
                                        if (!!otmOperations_1_1.done) return [3 /*break*/, 10];
                                        oper = otmOperations_1_1.value;
                                        return [4 /*yield*/, dealWithOneToMany(oper)];
                                    case 8:
                                        _l.sent();
                                        _l.label = 9;
                                    case 9:
                                        otmOperations_1_1 = otmOperations_1.next();
                                        return [3 /*break*/, 7];
                                    case 10: return [3 /*break*/, 13];
                                    case 11:
                                        e_2_1 = _l.sent();
                                        e_2 = { error: e_2_1 };
                                        return [3 /*break*/, 13];
                                    case 12:
                                        try {
                                            if (otmOperations_1_1 && !otmOperations_1_1.done && (_k = otmOperations_1.return)) _k.call(otmOperations_1);
                                        }
                                        finally { if (e_2) throw e_2.error; }
                                        return [7 /*endfinally*/];
                                    case 13: return [3 /*break*/, 16];
                                    case 14: return [4 /*yield*/, dealWithOneToMany(otmOperations)];
                                    case 15:
                                        _l.sent();
                                        _l.label = 16;
                                    case 16: return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _a = [];
                        for (_b in data)
                            _a.push(_b);
                        _i = 0;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        attr = _a[_i];
                        return [5 /*yield**/, _loop_2(attr)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, opData];
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
    CascadeStore.prototype.cascadeUpdate = function (entity, operation, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, data, filter, id, opData, result, multipleCreate, data_1, data_1_1, d, od, e_3_1, data_2, data_2_1, dataEle, result2, e_4_1, operation2, count;
            var e_3, _a, e_4, _b, _c, _d;
            return tslib_1.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        action = operation.action, data = operation.data, filter = operation.filter, id = operation.id;
                        result = {};
                        if (!(['create', 'create-l'].includes(action) && data instanceof Array)) return [3 /*break*/, 18];
                        multipleCreate = this.supportMultipleCreate();
                        if (!multipleCreate) return [3 /*break*/, 9];
                        opData = [];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 6, 7, 8]);
                        data_1 = tslib_1.__values(data), data_1_1 = data_1.next();
                        _e.label = 2;
                    case 2:
                        if (!!data_1_1.done) return [3 /*break*/, 5];
                        d = data_1_1.value;
                        return [4 /*yield*/, this.destructCascadeUpdate(entity, action, d, context, option, result)];
                    case 3:
                        od = _e.sent();
                        opData.push(od);
                        _e.label = 4;
                    case 4:
                        data_1_1 = data_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_3_1 = _e.sent();
                        e_3 = { error: e_3_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                        return [7 /*endfinally*/];
                    case 8: return [3 /*break*/, 17];
                    case 9:
                        _e.trys.push([9, 14, 15, 16]);
                        data_2 = tslib_1.__values(data), data_2_1 = data_2.next();
                        _e.label = 10;
                    case 10:
                        if (!!data_2_1.done) return [3 /*break*/, 13];
                        dataEle = data_2_1.value;
                        return [4 /*yield*/, this.cascadeUpdate(entity, {
                                id: id,
                                action: action,
                                data: dataEle,
                            }, context, option)];
                    case 11:
                        result2 = _e.sent();
                        this.mergeOperationResult(result, result2);
                        _e.label = 12;
                    case 12:
                        data_2_1 = data_2.next();
                        return [3 /*break*/, 10];
                    case 13: return [3 /*break*/, 16];
                    case 14:
                        e_4_1 = _e.sent();
                        e_4 = { error: e_4_1 };
                        return [3 /*break*/, 16];
                    case 15:
                        try {
                            if (data_2_1 && !data_2_1.done && (_b = data_2.return)) _b.call(data_2);
                        }
                        finally { if (e_4) throw e_4.error; }
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/, result];
                    case 17: return [3 /*break*/, 20];
                    case 18: return [4 /*yield*/, this.destructCascadeUpdate(entity, action, data, context, option, result, filter)];
                    case 19:
                        opData = _e.sent();
                        _e.label = 20;
                    case 20:
                        operation2 = Object.assign({}, operation, {
                            data: opData,
                        });
                        return [4 /*yield*/, this.doUpdateSingleRow(entity, operation2, context, option)];
                    case 21:
                        count = _e.sent();
                        this.mergeOperationResult(result, (_c = {},
                            _c[entity] = (_d = {},
                                _d[operation2.action] = count,
                                _d),
                            _c));
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    CascadeStore.prototype.doUpdateSingleRow = function (entity, operation, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var data, action, operId, filter, now, _a, modiCreate, addTimestamp_1, result_1, e_5, congruentRow_1, rest, result2, row, updateData, result3, _b, _c, updateData, result2, _d, _e, createOper, _f, ids, selection, rows, modiCreate, result_2, createOper;
            var _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
            var _this = this;
            return tslib_1.__generator(this, function (_u) {
                switch (_u.label) {
                    case 0:
                        data = operation.data, action = operation.action, operId = operation.id, filter = operation.filter;
                        now = Date.now();
                        _a = action;
                        switch (_a) {
                            case 'create': return [3 /*break*/, 1];
                        }
                        return [3 /*break*/, 23];
                    case 1:
                        if (!(option.modiParentEntity && !['modi', 'modiEntity', 'oper', 'operEntity'].includes(entity))) return [3 /*break*/, 3];
                        modiCreate = {
                            id: 'dummy',
                            action: 'create',
                            data: {
                                id: operId,
                                targetEntity: entity,
                                action: action,
                                entity: option.modiParentEntity,
                                entityId: option.modiParentId,
                                data: data,
                                iState: 'active',
                            },
                        };
                        return [4 /*yield*/, this.cascadeUpdate('modi', modiCreate, context, option)];
                    case 2:
                        _u.sent();
                        return [2 /*return*/, 1];
                    case 3:
                        addTimestamp_1 = function (data2) {
                            Object.assign(data2, {
                                $$createAt$$: now,
                                $$updateAt$$: now,
                            });
                        };
                        if (data instanceof Array) {
                            data.forEach(function (ele) { return addTimestamp_1(ele); });
                        }
                        else {
                            addTimestamp_1(data);
                        }
                        _u.label = 4;
                    case 4:
                        _u.trys.push([4, 6, , 15]);
                        return [4 /*yield*/, this.updateAbjointRow(entity, operation, context, option)];
                    case 5:
                        result_1 = _u.sent();
                        return [3 /*break*/, 15];
                    case 6:
                        e_5 = _u.sent();
                        if (!(e_5 instanceof types_1.OakCongruentRowExists)) return [3 /*break*/, 14];
                        if (!option.allowExists) return [3 /*break*/, 13];
                        congruentRow_1 = e_5.getData();
                        if (!(data instanceof Array)) return [3 /*break*/, 10];
                        rest = data.filter(function (ele) { return ele.id !== congruentRow_1.id; });
                        if (rest.length === data.length) {
                            throw e_5;
                        }
                        return [4 /*yield*/, this.updateAbjointRow(entity, Object.assign({}, operation, {
                                data: rest,
                            }), context, option)];
                    case 7:
                        result2 = _u.sent();
                        row = data.find(function (ele) { return ele.id === congruentRow_1.id; });
                        updateData = (0, lodash_1.omit)(row, ['id', '$$createAt$$']);
                        _b = this.updateAbjointRow;
                        _c = [entity];
                        _g = {};
                        return [4 /*yield*/, generateNewId()];
                    case 8: return [4 /*yield*/, _b.apply(this, _c.concat([(_g.id = _u.sent(),
                                _g.action = 'update',
                                _g.data = updateData,
                                _g.filter = {
                                    id: congruentRow_1.id,
                                },
                                _g), context,
                            option]))];
                    case 9:
                        result3 = _u.sent();
                        return [2 /*return*/, result2 + result3];
                    case 10:
                        if (data.id !== congruentRow_1.id) {
                            throw e_5;
                        }
                        updateData = (0, lodash_1.omit)(data, ['id', '$$createAt$$']);
                        _d = this.updateAbjointRow;
                        _e = [entity];
                        _h = {};
                        return [4 /*yield*/, generateNewId()];
                    case 11: return [4 /*yield*/, _d.apply(this, _e.concat([(_h.id = _u.sent(),
                                _h.action = 'update',
                                _h.data = updateData,
                                _h.filter = {
                                    id: congruentRow_1.id,
                                },
                                _h), context,
                            option]))];
                    case 12:
                        result2 = _u.sent();
                        return [2 /*return*/, result2];
                    case 13: throw e_5;
                    case 14: return [3 /*break*/, 15];
                    case 15:
                        if (!option.dontCollect) {
                            context.opRecords.push({
                                a: 'c',
                                e: entity,
                                d: data,
                            });
                        }
                        if (!(!option.dontCreateOper && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity))) return [3 /*break*/, 22];
                        // 按照框架要求生成Oper和OperEntity这两个内置的对象
                        (0, assert_1.default)(operId);
                        _j = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _k = {
                            id: operId,
                            action: action,
                            data: data
                        };
                        return [4 /*yield*/, context.getCurrentUserId()];
                    case 16:
                        _k.operatorId = _u.sent();
                        if (!(data instanceof Array)) return [3 /*break*/, 18];
                        _l = {
                            id: 'dummy',
                            action: 'create'
                        };
                        return [4 /*yield*/, Promise.all(data.map(function (ele) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var _a;
                                return tslib_1.__generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = {};
                                            return [4 /*yield*/, generateNewId()];
                                        case 1: return [2 /*return*/, (_a.id = _b.sent(),
                                                _a.entity = entity,
                                                _a.entityId = ele.id,
                                                _a)];
                                    }
                                });
                            }); }))];
                    case 17:
                        _f = [(_l.data = _u.sent(),
                                _l)];
                        return [3 /*break*/, 20];
                    case 18:
                        _m = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _o = {};
                        return [4 /*yield*/, generateNewId()];
                    case 19:
                        _f = [(_m.data = (_o.id = _u.sent(),
                                _o.entity = entity,
                                _o.entityId = data.id,
                                _o),
                                _m)];
                        _u.label = 20;
                    case 20:
                        createOper = (_j.data = (_k.operEntity$oper = _f,
                            _k),
                            _j);
                        return [4 /*yield*/, this.cascadeUpdate('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            })];
                    case 21:
                        _u.sent();
                        _u.label = 22;
                    case 22: return [2 /*return*/, result_1];
                    case 23:
                        ids = (0, filter_1.getRelevantIds)(filter);
                        if (!(ids.length === 0)) return [3 /*break*/, 25];
                        selection = {
                            data: {
                                id: 1,
                            },
                            filter: operation.filter,
                            indexFrom: operation.indexFrom,
                            count: operation.count,
                        };
                        return [4 /*yield*/, this.selectAbjointRow(entity, selection, context, {
                                dontCollect: true,
                            })];
                    case 24:
                        rows = _u.sent();
                        ids.push.apply(ids, tslib_1.__spreadArray([], tslib_1.__read((rows.map(function (ele) { return ele.id; }))), false));
                        _u.label = 25;
                    case 25:
                        if (!(option.modiParentEntity && !['modi', 'modiEntity'].includes(entity))) return [3 /*break*/, 28];
                        _p = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _q = {
                            id: operId,
                            targetEntity: entity,
                            entity: option.modiParentEntity,
                            entityId: option.modiParentId,
                            action: action,
                            data: data,
                            iState: 'active',
                            filter: {
                                id: {
                                    $in: ids,
                                },
                            }
                        };
                        _r = {
                            id: 'dummy',
                            action: 'create'
                        };
                        return [4 /*yield*/, Promise.all(ids.map(function (id) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var _a;
                                return tslib_1.__generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = {};
                                            return [4 /*yield*/, generateNewId()];
                                        case 1: return [2 /*return*/, (_a.id = _b.sent(),
                                                _a.entity = entity,
                                                _a.entityId = id,
                                                _a)];
                                    }
                                });
                            }); }))];
                    case 26:
                        modiCreate = (_p.data = (_q.modiEntity$modi = [
                            (_r.data = _u.sent(),
                                _r)
                        ],
                            _q),
                            _p);
                        return [4 /*yield*/, this.cascadeUpdate('modi', modiCreate, context, option)];
                    case 27:
                        _u.sent();
                        return [2 /*return*/, 1];
                    case 28:
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
                            if (Object.keys(data).length === 0) {
                                // 优化一下，如果不更新任何属性，则不实际执行
                                return [2 /*return*/, 0];
                            }
                            Object.assign(data, {
                                $$updateAt$$: now,
                            });
                            if (!option.dontCollect) {
                                context.opRecords.push({
                                    a: 'u',
                                    e: entity,
                                    d: data,
                                    f: {
                                        id: {
                                            $in: ids,
                                        }
                                    },
                                });
                            }
                        }
                        return [4 /*yield*/, this.updateAbjointRow(entity, operation, context, option)];
                    case 29:
                        result_2 = _u.sent();
                        if (!(!(option === null || option === void 0 ? void 0 : option.dontCreateOper) && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity) && ids.length > 0)) return [3 /*break*/, 32];
                        // 按照框架要求生成Oper和OperEntity这两个内置的对象
                        (0, assert_1.default)(operId);
                        _s = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _t = {
                            id: operId,
                            action: action,
                            data: data
                        };
                        return [4 /*yield*/, Promise.all(ids.map(function (ele) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                return tslib_1.__generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _a = {
                                                id: 'dummy',
                                                action: 'create'
                                            };
                                            _b = {};
                                            return [4 /*yield*/, generateNewId()];
                                        case 1: return [2 /*return*/, (_a.data = (_b.id = _c.sent(),
                                                _b.entity = entity,
                                                _b.entityId = ele,
                                                _b),
                                                _a)];
                                    }
                                });
                            }); }))];
                    case 30:
                        createOper = (_s.data = (_t.operEntity$oper = _u.sent(),
                            _t),
                            _s);
                        return [4 /*yield*/, this.cascadeUpdate('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            })];
                    case 31:
                        _u.sent();
                        _u.label = 32;
                    case 32: return [2 /*return*/, result_2];
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
