"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeStore = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var Entity_1 = require("../types/Entity");
var RowStore_1 = require("../types/RowStore");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var types_1 = require("../types");
var lodash_1 = require("../utils/lodash");
var filter_2 = require("./filter");
var uuid_1 = require("../utils/uuid");
/**这个用来处理级联的select和update，对不同能力的 */
var CascadeStore = /** @class */ (function (_super) {
    tslib_1.__extends(CascadeStore, _super);
    function CascadeStore(storageSchema) {
        return _super.call(this, storageSchema) || this;
    }
    CascadeStore.prototype.destructCascadeSelect = function (entity, projection2, context, cascadeSelect, option) {
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
                    cascadeSelectionFns.push(function (result) {
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
                    });
                    var _e = this_1.destructCascadeSelect(attr, projection2[attr], context, cascadeSelect, option), subProjection = _e.projection, subCascadeSelectionFns = _e.cascadeSelectionFns;
                    Object.assign(projection, (_b = {},
                        _b[attr] = subProjection,
                        _b));
                    subCascadeSelectionFns.forEach(function (ele) { return cascadeSelectionFns.push(function (result) {
                        return ele(result.map(function (ele2) { return ele2[attr]; }).filter(function (ele2) { return !!ele2; }));
                    }); });
                }
                else {
                    cascadeSelectionFns.push(function (result) {
                        var dealWithSubRows = function (subRows) {
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
                                var _a, _b;
                                if (ele.entity === attr) {
                                    var subRow = subRows.find(function (ele2) { return ele2.id === ele.entityId; });
                                    if (subRow) {
                                        Object.assign(ele, (_a = {},
                                            _a[attr] = subRow,
                                            _a));
                                    }
                                    else {
                                        Object.assign(ele, (_b = {},
                                            _b[attr] = null,
                                            _b));
                                    }
                                }
                            });
                        };
                        var entityIds = (0, lodash_1.uniq)(result.filter(function (ele) { return ele.entity === attr; }).map(function (ele) { return ele.entityId; }));
                        var subRows = cascadeSelect.call(_this, attr, {
                            data: projection2[attr],
                            filter: {
                                id: {
                                    $in: entityIds
                                },
                            },
                        }, context, option);
                        if (subRows instanceof Promise) {
                            return subRows.then(function (subRowss) { return dealWithSubRows(subRowss); });
                        }
                        else {
                            dealWithSubRows(subRows);
                        }
                    });
                }
            }
            else if (typeof relation === 'string') {
                Object.assign(projection, (_c = {},
                    _c["".concat(attr, "Id")] = 1,
                    _c));
                if (supportMtoJoin) {
                    if (!toModi) {
                        // 如果不是modi，要保证外键没有空指针
                        cascadeSelectionFns.push(function (result) {
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
                        });
                    }
                    var _f = this_1.destructCascadeSelect(relation, projection2[attr], context, cascadeSelect, option), subProjection = _f.projection, subCascadeSelectionFns = _f.cascadeSelectionFns;
                    Object.assign(projection, (_d = {},
                        _d[attr] = subProjection,
                        _d));
                    subCascadeSelectionFns.forEach(function (ele) { return cascadeSelectionFns.push(function (result) {
                        return ele(result.map(function (ele2) { return ele2[attr]; }).filter(function (ele2) { return !!ele2; }));
                    }); });
                }
                else {
                    cascadeSelectionFns.push(function (result) {
                        var dealWithSubRows = function (subRows) {
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
                                var _a, _b, _c;
                                if (ele["".concat(attr, "Id")]) {
                                    var subRow = subRows.find(function (ele2) { return ele2.id === ele["".concat(attr, "Id")]; });
                                    if (subRow) {
                                        Object.assign(ele, (_a = {},
                                            _a[attr] = subRow,
                                            _a));
                                    }
                                    else {
                                        Object.assign(ele, (_b = {},
                                            _b[attr] = null,
                                            _b));
                                    }
                                }
                                else {
                                    Object.assign(ele, (_c = {},
                                        _c[attr] = null,
                                        _c));
                                }
                            });
                        };
                        var ids = (0, lodash_1.uniq)(result.filter(function (ele) { return !!(ele["".concat(attr, "Id")]); }).map(function (ele) { return ele["".concat(attr, "Id")]; }));
                        var subRows = cascadeSelect.call(_this, relation, {
                            data: projection2[attr],
                            filter: {
                                id: {
                                    $in: ids
                                },
                            },
                        }, context, option);
                        if (subRows instanceof Promise) {
                            return subRows.then(function (subRowss) { return dealWithSubRows(subRowss); });
                        }
                        dealWithSubRows(subRows);
                    });
                }
            }
            else {
                (0, assert_1.default)(relation instanceof Array);
                var _g = projection2[attr], subProjection_1 = _g.data, subFilter_1 = _g.filter, indexFrom_1 = _g.indexFrom, count_1 = _g.count, subSorter_1 = _g.sorter;
                var _h = tslib_1.__read(relation, 2), entity2_1 = _h[0], foreignKey_1 = _h[1];
                if (foreignKey_1) {
                    // 基于属性的一对多
                    cascadeSelectionFns.push(function (result) {
                        var _a;
                        var ids = result.map(function (ele) { return ele.id; });
                        var dealWithSubRows = function (subRows) {
                            result.forEach(function (ele) {
                                var _a;
                                var subRowss = subRows.filter(function (ele2) { return ele2[foreignKey_1] === ele.id; });
                                (0, assert_1.default)(subRowss);
                                Object.assign(ele, (_a = {},
                                    _a[attr] = subRowss,
                                    _a));
                            });
                        };
                        var subRows = cascadeSelect.call(_this, entity2_1, {
                            data: subProjection_1,
                            filter: (0, filter_1.combineFilters)([(_a = {},
                                    _a[foreignKey_1] = {
                                        $in: ids,
                                    },
                                    _a), subFilter_1]),
                            sorter: subSorter_1,
                            indexFrom: indexFrom_1,
                            count: count_1
                        }, context, option);
                        if (subRows instanceof Promise) {
                            return subRows.then(function (subRowss) { return dealWithSubRows(subRowss); });
                        }
                        dealWithSubRows(subRows);
                    });
                }
                else {
                    // 基于entity的多对一
                    cascadeSelectionFns.push(function (result) {
                        var ids = result.map(function (ele) { return ele.id; });
                        var dealWithSubRows = function (subRows) {
                            result.forEach(function (ele) {
                                var _a;
                                var subRowss = subRows.filter(function (ele2) { return ele2.entityId === ele.id; });
                                (0, assert_1.default)(subRowss);
                                Object.assign(ele, (_a = {},
                                    _a[attr] = subRowss,
                                    _a));
                            });
                        };
                        var subRows = cascadeSelect.call(_this, entity2_1, {
                            data: subProjection_1,
                            filter: (0, filter_1.combineFilters)([{
                                    entity: entity,
                                    entityId: {
                                        $in: ids,
                                    }
                                }, subFilter_1]),
                            sorter: subSorter_1,
                            indexFrom: indexFrom_1,
                            count: count_1
                        }, context, option);
                        if (subRows instanceof Promise) {
                            return subRows.then(function (subRowss) { return dealWithSubRows(subRowss); });
                        }
                        dealWithSubRows(subRows);
                    });
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
    CascadeStore.prototype.destructCascadeUpdate = function (entity, action, data, context, option, cascadeUpdate, filter) {
        var _this = this;
        var modiAttr = this.getSchema()[entity].toModi;
        var option2 = Object.assign({}, option);
        var opData = {};
        var beforeFns = [];
        var afterFns = [];
        if (modiAttr && action !== 'remove' && !option.dontCreateModi) {
            // create/update具有modi对象的对象，对其子对象的update行为全部是create modi对象（缓存动作）
            // delete此对象，所有的modi子对象应该通过触发器作废，这个目前先通过系统的trigger来实现
            (0, assert_1.default)(!option2.modiParentId && !option2.modiParentEntity);
            if (action === 'create') {
                option2.modiParentId = data.id;
            }
            else {
                (0, assert_1.default)((filter === null || filter === void 0 ? void 0 : filter.id) && typeof filter.id === 'string');
                option2.modiParentId = filter.id;
            }
            option2.modiParentEntity = entity;
        }
        var _loop_2 = function (attr) {
            var _a, _b, _c, e_1, _d;
            var relation = (0, relation_1.judgeRelation)(this_2.storageSchema, entity, attr);
            if (relation === 1) {
                Object.assign(opData, (_a = {},
                    _a[attr] = data[attr],
                    _a));
            }
            else if (relation === 2) {
                // 基于entity/entityId的many-to-one
                var operationMto_1 = data[attr];
                var actionMto = operationMto_1.action, dataMto = operationMto_1.data, filterMto = operationMto_1.filter;
                if (actionMto === 'create') {
                    Object.assign(opData, {
                        entityId: dataMto.id,
                        entity: attr,
                    });
                }
                else if (action === 'create') {
                    var fkId = data.entityId, entity_1 = data.entity;
                    (0, assert_1.default)(typeof fkId === 'string' || entity_1 === attr);
                    if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(filterMto.id === fkId);
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto_1, {
                            filter: (0, filter_1.addFilterSegment)({
                                id: fkId,
                            }),
                            filterMto: filterMto,
                        });
                    }
                }
                else {
                    // 剩下三种情况都是B中的filter的id来自A中row的entityId
                    (0, assert_1.default)(!data.hasOwnProperty('entityId') && !data.hasOwnProperty('entity'));
                    if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(typeof filterMto.id === 'string');
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto_1, {
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
                }
                beforeFns.push(function () { return cascadeUpdate.call(_this, attr, operationMto_1, context, option2); });
            }
            else if (typeof relation === 'string') {
                // 基于attr的外键的many-to-one
                var operationMto_2 = data[attr];
                var actionMto = operationMto_2.action, dataMto = operationMto_2.data, filterMto = operationMto_2.filter;
                if (actionMto === 'create') {
                    Object.assign(opData, (_b = {},
                        _b["".concat(attr, "Id")] = dataMto.id,
                        _b));
                }
                else if (action === 'create') {
                    var _e = data, _f = "".concat(attr, "Id"), fkId = _e[_f];
                    (0, assert_1.default)(typeof fkId === 'string');
                    if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(filterMto.id === fkId);
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto_2, {
                            filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                                id: fkId,
                            }),
                        });
                    }
                }
                else {
                    (0, assert_1.default)(!data.hasOwnProperty("".concat(attr, "Id")));
                    if (filterMto === null || filterMto === void 0 ? void 0 : filterMto.id) {
                        // 若已有id则不用处理，否则会干扰modi的后续判断(会根据filter来判断对象id，如果判断不出来去查实际的对象，但实际的对象其实还未创建好)
                        (0, assert_1.default)(typeof filterMto.id === 'string');
                    }
                    else {
                        // A中data的entityId作为B中filter的主键
                        Object.assign(operationMto_2, {
                            filter: (0, filter_1.addFilterSegment)(filterMto || {}, {
                                id: {
                                    $in: {
                                        entity: entity,
                                        data: (_c = {},
                                            _c["".concat(attr, "Id")] = 1,
                                            _c),
                                        filter: filter,
                                    }
                                },
                            }),
                        });
                    }
                }
                beforeFns.push(function () { return cascadeUpdate.call(_this, relation, operationMto_2, context, option2); });
            }
            else {
                (0, assert_1.default)(relation instanceof Array);
                var _g = tslib_1.__read(relation, 2), entityOtm_1 = _g[0], foreignKey_2 = _g[1];
                var otmOperations = data[attr];
                var dealWithOneToMany = function (otm) {
                    var _a, _b, _c, _d;
                    var actionOtm = otm.action, dataOtm = otm.data, filterOtm = otm.filter;
                    if (!foreignKey_2) {
                        // 基于entity/entityId的one-to-many
                        if (action === 'create') {
                            var id_1 = data.id;
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
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            // todo 这个假设成立吗？等遇到create/create一对多的case再完善
                            var id_2 = filter.id;
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
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            // 这个倒是好像不可能出现create/update的一对多，如果遇到了再完善
                            var id = filter.id;
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
                            var id_3 = data.id;
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
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            // todo 这个假设成立吗？等遇到create/create一对多的case再完善
                            var id_4 = filter.id;
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
                            // 这里先假设A（必是update）的filter上一定有id，否则用户界面上应该设计不出来这样的操作
                            // 这个倒是好像不可能出现create/update的一对多，如果遇到了再完善
                            var id = filter.id;
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
                    afterFns.push(function () { return cascadeUpdate.call(_this, entityOtm_1, otm, context, option2); });
                };
                if (otmOperations instanceof Array) {
                    try {
                        for (var otmOperations_1 = (e_1 = void 0, tslib_1.__values(otmOperations)), otmOperations_1_1 = otmOperations_1.next(); !otmOperations_1_1.done; otmOperations_1_1 = otmOperations_1.next()) {
                            var oper = otmOperations_1_1.value;
                            dealWithOneToMany(oper);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (otmOperations_1_1 && !otmOperations_1_1.done && (_d = otmOperations_1.return)) _d.call(otmOperations_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else {
                    dealWithOneToMany(otmOperations);
                }
            }
        };
        var this_2 = this;
        for (var attr in data) {
            _loop_2(attr);
        }
        return {
            data: opData,
            beforeFns: beforeFns,
            afterFns: afterFns,
        };
    };
    // 对插入的数据，没有初始值的属性置null
    CascadeStore.prototype.preProcessDataCreated = function (entity, data) {
        var now = Date.now();
        var attributes = this.getSchema()[entity].attributes;
        var processSingle = function (data2) {
            var _a, _b;
            for (var key in attributes) {
                if (data2[key] === undefined) {
                    Object.assign(data2, (_a = {},
                        _a[key] = null,
                        _a));
                }
            }
            Object.assign(data2, (_b = {},
                _b[Entity_1.CreateAtAttribute] = now,
                _b[Entity_1.UpdateAtAttribute] = now,
                _b));
        };
        if (data instanceof Array) {
            data.forEach(function (ele) { return processSingle(ele); });
        }
        else {
            processSingle(data);
        }
    };
    // 对更新的数据，去掉所有的undefined属性
    CascadeStore.prototype.preProcessDataUpdated = function (data) {
        var undefinedKeys = Object.keys(data).filter(function (ele) { return data[ele] === undefined; });
        undefinedKeys.forEach(function (ele) { return (0, lodash_1.unset)(data, ele); });
    };
    CascadeStore.prototype.judgeRelation = function (entity, attr) {
        return (0, relation_1.judgeRelation)(this.storageSchema, entity, attr);
    };
    /**
     * 和具体的update过程无关的例程放在这里，包括对later动作的处理、对oper的记录以及对record的收集等
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    CascadeStore.prototype.doUpdateSingleRowAsync = function (entity, operation, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var data, action, operId, filter, now, _a, modiCreate, result_1, createInner, multipleCreate, data_1, data_1_1, d, createSingleOper, e_2_1, operatorId, createOper, _b, ids_1, selection, rows, modiUpsert, upsertModis, _c, originData, originId, createOper, updateAttrCount, result;
            var e_2, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            var _this = this;
            return tslib_1.__generator(this, function (_o) {
                switch (_o.label) {
                    case 0:
                        data = operation.data, action = operation.action, operId = operation.id, filter = operation.filter;
                        now = Date.now();
                        _a = action;
                        switch (_a) {
                            case 'create': return [3 /*break*/, 1];
                        }
                        return [3 /*break*/, 23];
                    case 1:
                        this.preProcessDataCreated(entity, data);
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
                                filter: {
                                    id: {
                                        $in: [data.id], //这里记录这个filter是为了后面update的时候直接在其上面update，参见本函数后半段关于modiUpsert相关的优化
                                    },
                                },
                                data: data,
                                iState: 'active',
                            },
                        };
                        return [4 /*yield*/, this.cascadeUpdateAsync('modi', modiCreate, context, option)];
                    case 2:
                        _o.sent();
                        return [2 /*return*/, 1];
                    case 3:
                        result_1 = 0;
                        createInner = function (operation2) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var _a, e_3;
                            return tslib_1.__generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        _a = result_1;
                                        return [4 /*yield*/, this.updateAbjointRowAsync(entity, operation2, context, option)];
                                    case 1:
                                        result_1 = _a + _b.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        e_3 = _b.sent();
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
                                        throw e_3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); };
                        if (!(data instanceof Array)) return [3 /*break*/, 13];
                        multipleCreate = this.supportMultipleCreate();
                        if (!multipleCreate) return [3 /*break*/, 5];
                        return [4 /*yield*/, createInner(operation)];
                    case 4:
                        _o.sent();
                        return [3 /*break*/, 12];
                    case 5:
                        _o.trys.push([5, 10, 11, 12]);
                        data_1 = tslib_1.__values(data), data_1_1 = data_1.next();
                        _o.label = 6;
                    case 6:
                        if (!!data_1_1.done) return [3 /*break*/, 9];
                        d = data_1_1.value;
                        createSingleOper = {
                            id: 'any',
                            action: 'create',
                            data: d,
                        };
                        return [4 /*yield*/, createInner(createSingleOper)];
                    case 7:
                        _o.sent();
                        _o.label = 8;
                    case 8:
                        data_1_1 = data_1.next();
                        return [3 /*break*/, 6];
                    case 9: return [3 /*break*/, 12];
                    case 10:
                        e_2_1 = _o.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 12];
                    case 11:
                        try {
                            if (data_1_1 && !data_1_1.done && (_d = data_1.return)) _d.call(data_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 12: return [3 /*break*/, 15];
                    case 13: return [4 /*yield*/, createInner(operation)];
                    case 14:
                        _o.sent();
                        _o.label = 15;
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
                        return [4 /*yield*/, context.getCurrentUserId(true)];
                    case 16:
                        operatorId = _o.sent();
                        if (!operatorId) return [3 /*break*/, 22];
                        _e = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _f = {
                            id: operId,
                            action: action,
                            data: data,
                            operatorId: operatorId
                        };
                        if (!(data instanceof Array)) return [3 /*break*/, 18];
                        _g = {
                            id: 'dummy',
                            action: 'create'
                        };
                        return [4 /*yield*/, Promise.all(data.map(function (ele) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var _a;
                                return tslib_1.__generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = {};
                                            return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                        case 1: return [2 /*return*/, (_a.id = _b.sent(),
                                                _a.entity = entity,
                                                _a.entityId = ele.id,
                                                _a)];
                                    }
                                });
                            }); }))];
                    case 17:
                        _b = (_g.data = _o.sent(),
                            _g);
                        return [3 /*break*/, 20];
                    case 18:
                        _h = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _j = {};
                        return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                    case 19:
                        _b = [(_h.data = (_j.id = _o.sent(),
                                _j.entity = entity,
                                _j.entityId = data.id,
                                _j),
                                _h)];
                        _o.label = 20;
                    case 20:
                        createOper = (_e.data = (_f.operEntity$oper = _b,
                            _f),
                            _e);
                        return [4 /*yield*/, this.cascadeUpdateAsync('oper', createOper, context, {
                                dontCollect: true,
                                dontCreateOper: true,
                            })];
                    case 21:
                        _o.sent();
                        _o.label = 22;
                    case 22: return [2 /*return*/, result_1];
                    case 23:
                        ids_1 = (0, filter_2.getRelevantIds)(filter);
                        if (!(ids_1.length === 0)) return [3 /*break*/, 25];
                        selection = {
                            data: {
                                id: 1,
                            },
                            filter: operation.filter,
                            indexFrom: operation.indexFrom,
                            count: operation.count,
                        };
                        return [4 /*yield*/, this.selectAbjointRowAsync(entity, selection, context, {
                                dontCollect: true,
                            })];
                    case 24:
                        rows = _o.sent();
                        ids_1.push.apply(ids_1, tslib_1.__spreadArray([], tslib_1.__read((rows.map(function (ele) { return ele.id; }))), false));
                        _o.label = 25;
                    case 25:
                        if (data) {
                            this.preProcessDataUpdated(data);
                        }
                        if (!(option.modiParentEntity && !['modi', 'modiEntity'].includes(entity))) return [3 /*break*/, 31];
                        modiUpsert = void 0;
                        if (!(action !== 'remove')) return [3 /*break*/, 27];
                        return [4 /*yield*/, this.selectAbjointRowAsync('modi', {
                                data: {
                                    id: 1,
                                    data: 1,
                                },
                                filter: {
                                    targetEntity: entity,
                                    action: {
                                        $in: ['create', 'update'],
                                    },
                                    iState: 'active',
                                    filter: ids_1.length > 0 ? {
                                        id: {
                                            $in: ids_1,
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
                            }, context, option)];
                    case 26:
                        upsertModis = _o.sent();
                        if (upsertModis.length > 0) {
                            _c = upsertModis[0], originData = _c.data, originId = _c.id;
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
                        _o.label = 27;
                    case 27:
                        if (!!modiUpsert) return [3 /*break*/, 29];
                        _k = {
                            id: 'dummy',
                            action: 'create'
                        };
                        _l = {
                            id: operId,
                            targetEntity: entity,
                            entity: option.modiParentEntity,
                            entityId: option.modiParentId,
                            action: action,
                            data: data,
                            iState: 'active',
                            filter: filter
                        };
                        _m = {
                            id: 'dummy',
                            action: 'create'
                        };
                        return [4 /*yield*/, Promise.all(ids_1.map(function (id) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var _a;
                                return tslib_1.__generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = {};
                                            return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                        case 1: return [2 /*return*/, (_a.id = _b.sent(),
                                                _a.entity = entity,
                                                _a.entityId = id,
                                                _a)];
                                    }
                                });
                            }); }))];
                    case 28:
                        modiUpsert = (_k.data = (_l.modiEntity$modi = (_m.data = _o.sent(),
                            _m),
                            _l),
                            _k);
                        _o.label = 29;
                    case 29: return [4 /*yield*/, this.cascadeUpdateAsync('modi', modiUpsert, context, option)];
                    case 30:
                        _o.sent();
                        return [2 /*return*/, 1];
                    case 31:
                        createOper = function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var createOper_1;
                            var _a, _b, _c;
                            var _this = this;
                            return tslib_1.__generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        if (!(!(option === null || option === void 0 ? void 0 : option.dontCreateOper) && !['oper', 'operEntity', 'modiEntity', 'modi'].includes(entity) && ids_1.length > 0)) return [3 /*break*/, 3];
                                        // 按照框架要求生成Oper和OperEntity这两个内置的对象
                                        (0, assert_1.default)(operId);
                                        _a = {
                                            id: 'dummy',
                                            action: 'create'
                                        };
                                        _b = {
                                            id: operId,
                                            action: action,
                                            data: data
                                        };
                                        _c = {
                                            id: 'dummy',
                                            action: 'create'
                                        };
                                        return [4 /*yield*/, Promise.all(ids_1.map(function (ele) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                                var _a;
                                                return tslib_1.__generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            _a = {};
                                                            return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                                        case 1: return [2 /*return*/, (_a.id = _b.sent(),
                                                                _a.entity = entity,
                                                                _a.entityId = ele,
                                                                _a)];
                                                    }
                                                });
                                            }); }))];
                                    case 1:
                                        createOper_1 = (_a.data = (_b.operEntity$oper = (_c.data = _d.sent(),
                                            _c),
                                            _b),
                                            _a);
                                        return [4 /*yield*/, this.cascadeUpdateAsync('oper', createOper_1, context, {
                                                dontCollect: true,
                                                dontCreateOper: true,
                                            })];
                                    case 2:
                                        _d.sent();
                                        _d.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); };
                        if (!(action === 'remove')) return [3 /*break*/, 32];
                        if (!option.dontCollect) {
                            context.opRecords.push({
                                a: 'r',
                                e: entity,
                                f: {
                                    id: {
                                        $in: ids_1,
                                    }
                                },
                            });
                        }
                        return [3 /*break*/, 36];
                    case 32:
                        updateAttrCount = Object.keys(data).length;
                        if (!(updateAttrCount > 0)) return [3 /*break*/, 33];
                        // 优化一下，如果不更新任何属性，则不实际执行
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
                                        $in: ids_1,
                                    }
                                },
                            });
                        }
                        return [3 /*break*/, 36];
                    case 33:
                        if (!(action !== 'update')) return [3 /*break*/, 35];
                        // 如果不是update动作而是用户自定义的动作，这里还是要记录oper
                        return [4 /*yield*/, createOper()];
                    case 34:
                        // 如果不是update动作而是用户自定义的动作，这里还是要记录oper
                        _o.sent();
                        return [2 /*return*/, 0];
                    case 35: return [2 /*return*/, 0];
                    case 36: return [4 /*yield*/, this.updateAbjointRowAsync(entity, operation, context, option)];
                    case 37:
                        result = _o.sent();
                        return [4 /*yield*/, createOper()];
                    case 38:
                        _o.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    CascadeStore.prototype.doUpdateSingleRow = function (entity, operation, context, option) {
        var e_4, _a;
        var _this = this;
        var data = operation.data, action = operation.action, operId = operation.id, filter = operation.filter;
        var now = Date.now();
        switch (action) {
            case 'create': {
                this.preProcessDataCreated(entity, data);
                var result_2 = 0;
                var createInner = function (operation2) {
                    try {
                        result_2 += _this.updateAbjointRow(entity, operation2, context, option);
                    }
                    catch (e) {
                        throw e;
                    }
                };
                if (data instanceof Array) {
                    var multipleCreate = this.supportMultipleCreate();
                    if (multipleCreate) {
                        createInner(operation);
                    }
                    else {
                        try {
                            for (var data_2 = tslib_1.__values(data), data_2_1 = data_2.next(); !data_2_1.done; data_2_1 = data_2.next()) {
                                var d = data_2_1.value;
                                var createSingleOper = {
                                    id: 'any',
                                    action: 'create',
                                    data: d,
                                };
                                createInner(createSingleOper);
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (data_2_1 && !data_2_1.done && (_a = data_2.return)) _a.call(data_2);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    }
                }
                else {
                    createInner(operation);
                }
                return result_2;
            }
            default: {
                if (action === 'remove') {
                }
                else {
                    var updateAttrCount = Object.keys(data).length;
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
    };
    CascadeStore.prototype.cascadeUpdate = function (entity, operation, context, option) {
        var e_5, _a, e_6, _b, e_7, _c;
        var action = operation.action, data = operation.data, filter = operation.filter, id = operation.id;
        var opData;
        var wholeBeforeFns = [];
        var wholeAfterFns = [];
        var result = {};
        if (['create', 'create-l'].includes(action) && data instanceof Array) {
            opData = [];
            try {
                for (var data_3 = tslib_1.__values(data), data_3_1 = data_3.next(); !data_3_1.done; data_3_1 = data_3.next()) {
                    var d = data_3_1.value;
                    var _d = this.destructCascadeUpdate(entity, action, d, context, option, this.cascadeUpdate), od = _d.data, beforeFns = _d.beforeFns, afterFns = _d.afterFns;
                    opData.push(od);
                    wholeBeforeFns.push.apply(wholeBeforeFns, tslib_1.__spreadArray([], tslib_1.__read(beforeFns), false));
                    wholeAfterFns.push.apply(wholeAfterFns, tslib_1.__spreadArray([], tslib_1.__read(afterFns), false));
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (data_3_1 && !data_3_1.done && (_a = data_3.return)) _a.call(data_3);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        else {
            var _e = this.destructCascadeUpdate(entity, action, data, context, option, this.cascadeUpdate, filter), od = _e.data, beforeFns = _e.beforeFns, afterFns = _e.afterFns;
            opData = od;
            wholeBeforeFns.push.apply(wholeBeforeFns, tslib_1.__spreadArray([], tslib_1.__read(beforeFns), false));
            wholeAfterFns.push.apply(wholeAfterFns, tslib_1.__spreadArray([], tslib_1.__read(afterFns), false));
        }
        var operation2 = Object.assign({}, operation, {
            data: opData,
        });
        try {
            for (var wholeBeforeFns_1 = tslib_1.__values(wholeBeforeFns), wholeBeforeFns_1_1 = wholeBeforeFns_1.next(); !wholeBeforeFns_1_1.done; wholeBeforeFns_1_1 = wholeBeforeFns_1.next()) {
                var before_1 = wholeBeforeFns_1_1.value;
                before_1();
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (wholeBeforeFns_1_1 && !wholeBeforeFns_1_1.done && (_b = wholeBeforeFns_1.return)) _b.call(wholeBeforeFns_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        var count = this.doUpdateSingleRow(entity, operation2, context, option);
        try {
            for (var wholeAfterFns_1 = tslib_1.__values(wholeAfterFns), wholeAfterFns_1_1 = wholeAfterFns_1.next(); !wholeAfterFns_1_1.done; wholeAfterFns_1_1 = wholeAfterFns_1.next()) {
                var after_1 = wholeAfterFns_1_1.value;
                after_1();
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (wholeAfterFns_1_1 && !wholeAfterFns_1_1.done && (_c = wholeAfterFns_1.return)) _c.call(wholeAfterFns_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        return result;
    };
    /**
     *
     * @param entity
     * @param operation
     * @param context
     * @param option
     */
    CascadeStore.prototype.cascadeUpdateAsync = function (entity, operation, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var action, data, filter, id, opData, wholeBeforeFns, wholeAfterFns, result, data_4, data_4_1, d, _a, od, beforeFns, afterFns, _b, od, beforeFns, afterFns, operation2, wholeBeforeFns_2, wholeBeforeFns_2_1, before_2, e_8_1, count, wholeAfterFns_2, wholeAfterFns_2_1, after_2, e_9_1;
            var e_10, _c, e_8, _d, _e, _f, e_9, _g;
            return tslib_1.__generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        action = operation.action, data = operation.data, filter = operation.filter, id = operation.id;
                        wholeBeforeFns = [];
                        wholeAfterFns = [];
                        result = {};
                        if (['create', 'create-l'].includes(action) && data instanceof Array) {
                            opData = [];
                            try {
                                for (data_4 = tslib_1.__values(data), data_4_1 = data_4.next(); !data_4_1.done; data_4_1 = data_4.next()) {
                                    d = data_4_1.value;
                                    _a = this.destructCascadeUpdate(entity, action, d, context, option, this.cascadeUpdateAsync), od = _a.data, beforeFns = _a.beforeFns, afterFns = _a.afterFns;
                                    opData.push(od);
                                    wholeBeforeFns.push.apply(wholeBeforeFns, tslib_1.__spreadArray([], tslib_1.__read(beforeFns), false));
                                    wholeAfterFns.push.apply(wholeAfterFns, tslib_1.__spreadArray([], tslib_1.__read(afterFns), false));
                                }
                            }
                            catch (e_10_1) { e_10 = { error: e_10_1 }; }
                            finally {
                                try {
                                    if (data_4_1 && !data_4_1.done && (_c = data_4.return)) _c.call(data_4);
                                }
                                finally { if (e_10) throw e_10.error; }
                            }
                        }
                        else {
                            _b = this.destructCascadeUpdate(entity, action, data, context, option, this.cascadeUpdateAsync, filter), od = _b.data, beforeFns = _b.beforeFns, afterFns = _b.afterFns;
                            opData = od;
                            wholeBeforeFns.push.apply(wholeBeforeFns, tslib_1.__spreadArray([], tslib_1.__read(beforeFns), false));
                            wholeAfterFns.push.apply(wholeAfterFns, tslib_1.__spreadArray([], tslib_1.__read(afterFns), false));
                        }
                        operation2 = Object.assign({}, operation, {
                            data: opData,
                        });
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 6, 7, 8]);
                        wholeBeforeFns_2 = tslib_1.__values(wholeBeforeFns), wholeBeforeFns_2_1 = wholeBeforeFns_2.next();
                        _h.label = 2;
                    case 2:
                        if (!!wholeBeforeFns_2_1.done) return [3 /*break*/, 5];
                        before_2 = wholeBeforeFns_2_1.value;
                        return [4 /*yield*/, before_2()];
                    case 3:
                        _h.sent();
                        _h.label = 4;
                    case 4:
                        wholeBeforeFns_2_1 = wholeBeforeFns_2.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_8_1 = _h.sent();
                        e_8 = { error: e_8_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (wholeBeforeFns_2_1 && !wholeBeforeFns_2_1.done && (_d = wholeBeforeFns_2.return)) _d.call(wholeBeforeFns_2);
                        }
                        finally { if (e_8) throw e_8.error; }
                        return [7 /*endfinally*/];
                    case 8: return [4 /*yield*/, this.doUpdateSingleRowAsync(entity, operation2, context, option)];
                    case 9:
                        count = _h.sent();
                        this.mergeOperationResult(result, (_e = {},
                            _e[entity] = (_f = {},
                                _f[operation2.action] = count,
                                _f),
                            _e));
                        _h.label = 10;
                    case 10:
                        _h.trys.push([10, 15, 16, 17]);
                        wholeAfterFns_2 = tslib_1.__values(wholeAfterFns), wholeAfterFns_2_1 = wholeAfterFns_2.next();
                        _h.label = 11;
                    case 11:
                        if (!!wholeAfterFns_2_1.done) return [3 /*break*/, 14];
                        after_2 = wholeAfterFns_2_1.value;
                        return [4 /*yield*/, after_2()];
                    case 12:
                        _h.sent();
                        _h.label = 13;
                    case 13:
                        wholeAfterFns_2_1 = wholeAfterFns_2.next();
                        return [3 /*break*/, 11];
                    case 14: return [3 /*break*/, 17];
                    case 15:
                        e_9_1 = _h.sent();
                        e_9 = { error: e_9_1 };
                        return [3 /*break*/, 17];
                    case 16:
                        try {
                            if (wholeAfterFns_2_1 && !wholeAfterFns_2_1.done && (_g = wholeAfterFns_2.return)) _g.call(wholeAfterFns_2);
                        }
                        finally { if (e_9) throw e_9.error; }
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/, result];
                }
            });
        });
    };
    CascadeStore.prototype.cascadeSelect = function (entity, selection, context, option) {
        var data = selection.data, filter = selection.filter, indexFrom = selection.indexFrom, count = selection.count, sorter = selection.sorter;
        var _a = this.destructCascadeSelect(entity, data, context, this.cascadeSelect, option), projection = _a.projection, cascadeSelectionFns = _a.cascadeSelectionFns;
        var rows = this.selectAbjointRow(entity, {
            data: projection,
            filter: filter,
            indexFrom: indexFrom,
            count: count,
            sorter: sorter
        }, context, option);
        if (cascadeSelectionFns.length > 0) {
            var ruException_1 = [];
            cascadeSelectionFns.forEach(function (ele) {
                try {
                    ele(rows);
                }
                catch (e) {
                    if (e instanceof types_1.OakRowUnexistedException) {
                        var rows_1 = e.getRows();
                        ruException_1.push.apply(ruException_1, tslib_1.__spreadArray([], tslib_1.__read(rows_1), false));
                    }
                    else {
                        throw e;
                    }
                }
            });
            if (ruException_1.length > 0) {
                throw new types_1.OakRowUnexistedException(ruException_1);
            }
        }
        return rows;
    };
    /**
     * 将一次查询的结果集加入result
     * todo 如果是supportMtoOJoin，这里还要解构（未充分测试）
     * @param entity
     * @param rows
     * @param context
     */
    CascadeStore.prototype.addToResultSelections = function (entity, rows, context) {
        if (this.supportManyToOneJoin()) {
            var attrsToPick_1 = [];
            var _loop_3 = function (attr) {
                var data = {};
                var rel = this_3.judgeRelation(entity, attr);
                if (rel === 2) {
                    this_3.addToResultSelections(attr, rows.map(function (ele) { return ele[attr]; }).filter(function (ele) { return !!ele; }), context);
                }
                else if (typeof rel === 'string') {
                    this_3.addToResultSelections(rel, rows.map(function (ele) { return ele[attr]; }).filter(function (ele) { return !!ele; }), context);
                }
                else if (rel instanceof Array) {
                    this_3.addToResultSelections(rel[0], rows.map(function (ele) { return ele[attr]; }).reduce(function (prev, current) { return prev.concat(current); }, []), context);
                }
                else {
                    attrsToPick_1.push(attr);
                }
            };
            var this_3 = this;
            for (var attr in rows[0]) {
                _loop_3(attr);
            }
            var originRows = rows.map(function (ele) { return (0, lodash_1.pick)(ele, attrsToPick_1); });
            this.addSingleRowToResultSelections(entity, originRows, context);
        }
        else {
            this.addSingleRowToResultSelections(entity, rows, context);
        }
    };
    CascadeStore.prototype.addSingleRowToResultSelections = function (entity, rows, context) {
        var _a;
        var opRecords = context.opRecords;
        var lastOperation = opRecords[opRecords.length - 1];
        if (lastOperation && lastOperation.a === 's') {
            var entityBranch_1 = lastOperation.d[entity];
            if (entityBranch_1) {
                rows.forEach(function (row) {
                    var _a;
                    if (row) {
                        (0, assert_1.default)(row.id);
                        var id = row.id;
                        if (!entityBranch_1[id]) {
                            Object.assign(entityBranch_1, (_a = {},
                                _a[id] = row,
                                _a));
                        }
                        else {
                            Object.assign(entityBranch_1[id], row);
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
        var entityBranch = {};
        rows.forEach(function (row) {
            var _a;
            if (row) {
                var id = row.id;
                Object.assign(entityBranch, (_a = {},
                    _a[id] = row,
                    _a));
            }
        });
        Object.assign(lastOperation.d, (_a = {},
            _a[entity] = entityBranch,
            _a));
    };
    CascadeStore.prototype.cascadeSelectAsync = function (entity, selection, context, option) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var data, filter, indexFrom, count, sorter, _a, projection, cascadeSelectionFns, rows, ruException_2;
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = selection.data, filter = selection.filter, indexFrom = selection.indexFrom, count = selection.count, sorter = selection.sorter;
                        _a = this.destructCascadeSelect(entity, data, context, this.cascadeSelectAsync, option), projection = _a.projection, cascadeSelectionFns = _a.cascadeSelectionFns;
                        return [4 /*yield*/, this.selectAbjointRowAsync(entity, {
                                data: projection,
                                filter: filter,
                                indexFrom: indexFrom,
                                count: count,
                                sorter: sorter
                            }, context, option)];
                    case 1:
                        rows = _b.sent();
                        if (!option.dontCollect) {
                            this.addToResultSelections(entity, rows, context);
                        }
                        if (!(cascadeSelectionFns.length > 0)) return [3 /*break*/, 3];
                        ruException_2 = [];
                        return [4 /*yield*/, Promise.all(cascadeSelectionFns.map(function (ele) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var e_11, rows_2;
                                return tslib_1.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, ele(rows)];
                                        case 1:
                                            _a.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            e_11 = _a.sent();
                                            if (e_11 instanceof types_1.OakRowUnexistedException) {
                                                rows_2 = e_11.getRows();
                                                ruException_2.push.apply(ruException_2, tslib_1.__spreadArray([], tslib_1.__read(rows_2), false));
                                            }
                                            else {
                                                throw e_11;
                                            }
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 2:
                        _b.sent();
                        if (ruException_2.length > 0) {
                            throw new types_1.OakRowUnexistedException(ruException_2);
                        }
                        _b.label = 3;
                    case 3: return [2 /*return*/, rows];
                }
            });
        });
    };
    return CascadeStore;
}(RowStore_1.RowStore));
exports.CascadeStore = CascadeStore;
