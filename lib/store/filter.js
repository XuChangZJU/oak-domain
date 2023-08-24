"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFilterRepel = exports.checkFilterContains = exports.checkDeduceFilters = exports.makeTreeDescendantFilter = exports.makeTreeAncestorFilter = exports.same = exports.getRelevantIds = exports.repel = exports.contains = exports.judgeValueRelation = exports.combineFilters = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var lodash_1 = require("../utils/lodash");
var relation_1 = require("./relation");
/**
 * 尽量合并外键的连接，防止在数据库中join的对象过多
 * @param entity
 * @param schema
 * @param filters
 * @returns
 */
function addFilterSegment(entity, schema) {
    var filters = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        filters[_i - 2] = arguments[_i];
    }
    var filter;
    var addIntoAnd = function (f) {
        (0, assert_1.default)(filter);
        if (filter.$and) {
            filter.$and.push(f);
        }
        else {
            filter.$and = [f];
        }
    };
    var addSingleAttr = function (attr, value) {
        var _a;
        (0, assert_1.default)(filter);
        if (!filter[attr]) {
            filter[attr] = value;
        }
        // 只优化一种情况，就是两个都等值且相等
        else if (filter[attr] === value) {
        }
        else {
            addIntoAnd((_a = {},
                _a[attr] = value,
                _a));
        }
    };
    var manyToOneFilters = {};
    var addManyToOneFilter = function (attr, entity2, filter) {
        if (manyToOneFilters[attr]) {
            manyToOneFilters[attr].push([entity2, filter]);
        }
        else {
            manyToOneFilters[attr] = [[entity2, filter]];
        }
    };
    var oneToManyFilters = {};
    var addOneToManyFilter = function (attr, entity2, filter) {
        if (oneToManyFilters[attr]) {
            oneToManyFilters[attr].push([entity2, filter]);
        }
        else {
            oneToManyFilters[attr] = [[entity2, filter]];
        }
    };
    var addInner = function (f) {
        var _a;
        if (f) {
            if (!filter) {
                filter = {};
            }
            if (f.hasOwnProperty('$or')) {
                // 如果有or是无法优化的，直接作为一个整体加入$and
                addIntoAnd(f);
                return;
            }
            for (var attr in f) {
                if (attr === '$and') {
                    f[attr].forEach(function (f2) { return addInner(f2); });
                }
                else if (attr.startsWith('$')) {
                    addIntoAnd((_a = {},
                        _a[attr] = f[attr],
                        _a));
                }
                else if (attr.startsWith('#')) {
                    (0, assert_1.default)(!filter[attr] || filter[attr] === f[attr]);
                    filter[attr] = f[attr];
                }
                else {
                    var rel = (0, relation_1.judgeRelation)(schema, entity, attr);
                    if (rel === 1) {
                        addSingleAttr(attr, f[attr]);
                    }
                    else if (rel === 2) {
                        addManyToOneFilter(attr, attr, f[attr]);
                    }
                    else if (typeof rel === 'string') {
                        addManyToOneFilter(attr, rel, f[attr]);
                    }
                    else {
                        (0, assert_1.default)(rel instanceof Array);
                        addOneToManyFilter(attr, rel[0], f[attr]);
                    }
                }
            }
        }
    };
    filters.forEach(function (ele) { return addInner(ele); });
    for (var attr in manyToOneFilters) {
        var filters2 = manyToOneFilters[attr].map(function (ele) { return ele[1]; });
        var combined = addFilterSegment.apply(void 0, tslib_1.__spreadArray([manyToOneFilters[attr][0][0], schema], tslib_1.__read(filters2), false));
        addSingleAttr(attr, combined);
    }
    var _loop_1 = function (attr) {
        var _a, _b;
        var filters2 = oneToManyFilters[attr].map(function (ele) { return ele[1]; });
        var sqpOps = filters2.map(function (ele) { return ele['#sqp'] || 'in'; });
        // 只有全部是同一个子查询算子才能实施合并
        if ((0, lodash_1.uniq)(sqpOps).length > 1) {
            filters2.forEach(function (ele) {
                var _a;
                addIntoAnd((_a = {},
                    _a[attr] = ele,
                    _a));
            });
        }
        else {
            var sqpOp = sqpOps[0];
            if (sqpOp === 'not in') {
                // not in 在此变成or查询
                var unioned = unionFilterSegment.apply(void 0, tslib_1.__spreadArray([oneToManyFilters[attr][0][0], schema], tslib_1.__read(filters2), false));
                addSingleAttr(attr, Object.assign(unioned, (_a = {},
                    _a['#sqp'] = sqpOp,
                    _a)));
            }
            else {
                (0, assert_1.default)(sqpOp === 'in'); // all 和 not all暂时不会出现
                var combined = addFilterSegment.apply(void 0, tslib_1.__spreadArray([oneToManyFilters[attr][0][0], schema], tslib_1.__read(filters2), false));
                addSingleAttr(attr, Object.assign(combined, (_b = {},
                    _b['#sqp'] = sqpOp,
                    _b)));
            }
        }
    };
    for (var attr in oneToManyFilters) {
        _loop_1(attr);
    }
    return filter;
}
/**
 * 尽量合并外键的连接，防止在数据库中join的对象过多
 * @param entity
 * @param schema
 * @param filters
 * @returns
 */
function unionFilterSegment(entity, schema) {
    var filters = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        filters[_i - 2] = arguments[_i];
    }
    var filter;
    var possibleCombiningAttrs = function (f1, f2) {
        var e_1, _a, e_2, _b;
        var pca1s = [], pca2s = [];
        var attributes1 = Object.keys(f1);
        var attributes2 = Object.keys(f2);
        try {
            for (var attributes1_1 = tslib_1.__values(attributes1), attributes1_1_1 = attributes1_1.next(); !attributes1_1_1.done; attributes1_1_1 = attributes1_1.next()) {
                var a = attributes1_1_1.value;
                if (a.startsWith('#')) {
                    if (f1[a] !== f2[a]) {
                        // metadata不相等，无法合并
                        return false;
                    }
                }
                else {
                    pca1s.push(a);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (attributes1_1_1 && !attributes1_1_1.done && (_a = attributes1_1.return)) _a.call(attributes1_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var attributes2_1 = tslib_1.__values(attributes2), attributes2_1_1 = attributes2_1.next(); !attributes2_1_1.done; attributes2_1_1 = attributes2_1.next()) {
                var a = attributes2_1_1.value;
                if (a.startsWith('#')) {
                    if (f1[a] !== f2[a]) {
                        // metadata不相等，无法合并
                        return false;
                    }
                }
                else {
                    pca2s.push(a);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (attributes2_1_1 && !attributes2_1_1.done && (_b = attributes2_1.return)) _b.call(attributes2_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (pca1s.length > 1 || pca2s.length > 1) {
            return false;
        }
        (0, assert_1.default)(pca1s.length === 1 && pca2s.length === 1);
        if (pca1s[0] !== pca2s[0] && pca1s[0] !== '$or' && pca2s[0] !== '$or') {
            return false;
        }
        return [pca1s[0], pca2s[0]];
    };
    /**
     * 尝试合并同一个属性到f1上，这里只合并等值查询和$in
     * @param f1
     * @param f2
     * @param attr
     * @param justTry
     */
    var tryMergeAttributeValue = function (f1, f2, attr, justTry) {
        var _a, _b, _c, _d;
        var op1 = typeof f1[attr] === 'object' && Object.keys(f1[attr])[0];
        var op2 = typeof f2[attr] === 'object' && Object.keys(f2[attr])[0];
        if (!op1 && op2 && ['$eq', '$in'].includes(op2)) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, (_a = {},
                _a[attr] = {
                    $in: f2[attr][op2] instanceof Array ? f2[attr][op2].concat(f1[attr]) : [f1[attr], f2[attr][op2]],
                },
                _a));
            return true;
        }
        else if (!op2 && op1 && ['$eq', '$in'].includes(op1)) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, (_b = {},
                _b[attr] = {
                    $in: f1[attr][op1] instanceof Array ? f1[attr][op1].concat(f2[attr]) : [f1[op1][attr], f2[attr]],
                },
                _b));
            return true;
        }
        else if (op1 && ['$eq', '$in'].includes(op1) && op2 && ['$eq', '$in'].includes(op2)) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, (_c = {},
                _c[attr] = {
                    $in: f1[attr][op1] instanceof Array ? f1[attr][op1].concat(f2[attr][op2]) : [f1[attr][op1]].concat(f2[attr][op2]),
                },
                _c));
            return true;
        }
        else if (!op1 && !op2) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, (_d = {},
                _d[attr] = {
                    $in: [f1[attr], f2[attr]],
                },
                _d));
            return true;
        }
        return false;
    };
    /**
     * 把f2尝试combine到f1中，保持or的语义
     * @param f1
     * @param f2
     * @returns
     */
    var tryMergeFilters = function (f1, f2, justTry) {
        var e_3, _a, e_4, _b, e_5, _c, e_6, _d, e_7, _e, e_8, _f, e_9, _g, _h, _j, _k, _l, _m, _o, _p;
        var pcaResult = possibleCombiningAttrs(f1, f2);
        if (!pcaResult) {
            return false;
        }
        var _q = tslib_1.__read(pcaResult, 2), pca1 = _q[0], pca2 = _q[1];
        if (pca1 === '$or' && pca2 === '$or') {
            try {
                // 如果双方都是or，有可能可以交叉合并，如：
                /**
                 * {
                        $or: [
                            {
                                password: '1234',
                            },
                            {
                                ref: {
                                    nickname: 'xc',
                                },
                            }
                        ]
                    },
                    {
                        $or: [
                            {
                                ref: {
                                    name: 'xc2',
                                }
                            },
                            {
                                password: 'dddd',
                            }
                        ]
                    }
                 */
                for (var _r = tslib_1.__values(f2[pca2]), _s = _r.next(); !_s.done; _s = _r.next()) {
                    var f21 = _s.value;
                    var success = false;
                    try {
                        for (var _t = (e_4 = void 0, tslib_1.__values(f1[pca2])), _u = _t.next(); !_u.done; _u = _t.next()) {
                            var f11 = _u.value;
                            if (tryMergeFilters(f11, f21, true)) {
                                success = true;
                                break;
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_u && !_u.done && (_b = _t.return)) _b.call(_t);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    if (!success) {
                        return false;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_s && !_s.done && (_a = _r.return)) _a.call(_r);
                }
                finally { if (e_3) throw e_3.error; }
            }
            if (justTry) {
                return true;
            }
            try {
                for (var _v = tslib_1.__values(f2[pca2]), _w = _v.next(); !_w.done; _w = _v.next()) {
                    var f21 = _w.value;
                    try {
                        for (var _x = (e_6 = void 0, tslib_1.__values(f1[pca2])), _y = _x.next(); !_y.done; _y = _x.next()) {
                            var f11 = _y.value;
                            if (tryMergeFilters(f11, f21)) {
                                break;
                            }
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_y && !_y.done && (_d = _x.return)) _d.call(_x);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_w && !_w.done && (_c = _v.return)) _c.call(_v);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return true;
        }
        else if (pca1 === '$or') {
            try {
                for (var _z = tslib_1.__values(f1[pca1]), _0 = _z.next(); !_0.done; _0 = _z.next()) {
                    var f11 = _0.value;
                    if (tryMergeFilters(f11, f2, justTry)) {
                        return true;
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_0 && !_0.done && (_e = _z.return)) _e.call(_z);
                }
                finally { if (e_7) throw e_7.error; }
            }
            return false;
        }
        else if (pca2 === '$or') {
            try {
                for (var _1 = tslib_1.__values(f2[pca2]), _2 = _1.next(); !_2.done; _2 = _1.next()) {
                    var f21 = _2.value;
                    if (!tryMergeFilters(f1, f21, true)) {
                        return false;
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_2 && !_2.done && (_f = _1.return)) _f.call(_1);
                }
                finally { if (e_8) throw e_8.error; }
            }
            if (justTry) {
                return true;
            }
            try {
                for (var _3 = tslib_1.__values(f2[pca2]), _4 = _3.next(); !_4.done; _4 = _3.next()) {
                    var f12 = _4.value;
                    tryMergeFilters(f1, f12);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_4 && !_4.done && (_g = _3.return)) _g.call(_3);
                }
                finally { if (e_9) throw e_9.error; }
            }
            return true;
        }
        else if (pca1 === pca2) {
            if (pca1 === '$and') {
                (0, assert_1.default)(false, '只一个属性的时候不应该用$and');
            }
            else if (pca1 === '$not') {
                // 先not后or 等于先and后not
                if (justTry) {
                    return true;
                }
                Object.assign(f1, (_h = {},
                    _h[pca1] = addFilterSegment(entity, schema, f1[pca1], f2[pca2]),
                    _h));
                return true;
            }
            else if (pca1.startsWith('$')) {
                return false;
            }
            else {
                // 原生属性
                var rel = (0, relation_1.judgeRelation)(schema, entity, pca1);
                if (rel === 1) {
                    return tryMergeAttributeValue(f1, f2, pca1, justTry);
                }
                else if (rel === 2) {
                    if (justTry) {
                        return true;
                    }
                    Object.assign(f1, (_j = {},
                        _j[pca1] = unionFilterSegment(pca1, schema, f1[pca1], f2[pca2]),
                        _j));
                    return true;
                }
                else if (typeof rel === 'string') {
                    if (justTry) {
                        return true;
                    }
                    Object.assign(f1, (_k = {},
                        _k[pca1] = unionFilterSegment(rel, schema, f1[pca1], f2[pca2]),
                        _k));
                    return true;
                }
                else {
                    (0, assert_1.default)(rel instanceof Array);
                    // 一对多的子查询，只有子查询的语义算子一样才实施合并
                    var sqpOp1 = f1[pca1]['#sqp'];
                    var sqpOp2 = f2[pca1]['#sqp'];
                    if (sqpOp1 !== sqpOp2) {
                        return false;
                    }
                    if (justTry) {
                        return true;
                    }
                    if (sqpOp1 === 'in') {
                        Object.assign(f1, (_l = {},
                            _l[pca1] = Object.assign(unionFilterSegment(rel[0], schema, f1[pca1], f2[pca2]), (_m = {},
                                _m['#sqp'] = sqpOp1,
                                _m)),
                            _l));
                    }
                    else {
                        // not in情况子查询变成and
                        (0, assert_1.default)(sqpOp1 === 'not in'); // all和not all暂时不支持
                        Object.assign(f1, (_o = {},
                            _o[pca1] = Object.assign(addFilterSegment(rel[0], schema, f1[pca1], f2[pca2]), (_p = {},
                                _p['#sqp'] = sqpOp1,
                                _p)),
                            _o));
                    }
                }
            }
        }
        return false;
    };
    var addIntoOr = function (f) {
        (0, assert_1.default)(filter);
        if (Object.keys(filter).length === 0) {
            Object.assign(filter, f);
        }
        else if (filter.$or) {
            filter.$or.push(f);
        }
        else {
            filter = {
                $or: [(0, lodash_1.cloneDeep)(filter), f],
            };
        }
    };
    var addInner = function (f) {
        if (f) {
            if (!filter) {
                filter = (0, lodash_1.cloneDeep)(f);
                return;
            }
            if (tryMergeFilters(filter, f)) {
                return;
            }
            addIntoOr(f);
        }
    };
    filters.forEach(function (f) { return addInner(f); });
    return filter;
}
function combineFilters(entity, schema, filters, union) {
    if (union) {
        return unionFilterSegment.apply(void 0, tslib_1.__spreadArray([entity, schema], tslib_1.__read(filters), false));
    }
    return addFilterSegment.apply(void 0, tslib_1.__spreadArray([entity, schema], tslib_1.__read(filters), false));
}
exports.combineFilters = combineFilters;
/**
 * 在以下判断相容或相斥的过程中，相容/相斥的事实标准是：满足两个条件的查询集合是否被包容/互斥，但如果两个filter在逻辑上相容或者相斥，在事实上不一定相容或者相斥
 * 例如：{ a: 1 } 和 { a: { $ne: 1 } } 是明显不相容的查询，但如果数据为空集，则这两个查询并不能否定其相容
 * 我们在处理这类数据时，优先使用逻辑判定的结果（更符合查询本身的期望而非真实数据集），同时也可减少对真实数据集不必要的查询访问
 */
/**
 * 判断value1表达的单个属性查询与同属性上value2表达的查询是包容还是相斥
 * 相容即value1所表达的查询结果一定被value2表达的查询结果所包含，例如：
 * value1: {
 *  $eq: 12
 * }
 * value2: {
 *  $gt: 8,
 * }
 * 此时value1相容value2
 *
 * 相斥即value1所表达的查询结果与value2一定毫无联系，例如：
 * value1: {
 *  $gt: 8,
 * }
 * value2: {
 *  $lt: 2,
 * }
 *
 *
 * @param value1
 * @param value2
 * @return true代表肯定相容/相斥，false代表肯定不相容/不相斥，undefined代表不能确定
 * @attention: 1)这里的测试不够充分，有些算子之间的相容或相斥可能有遗漏, 2)有新的算子加入需要修改代码
 */
function judgeValueRelation(value1, value2, contained) {
    if (typeof value1 === 'object') {
        var attr = Object.keys(value1)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne', '$startsWith', '$endsWith', '$includes'].includes(attr)) {
            switch (attr) {
                case '$gt': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && ['$gt', '$gte'].includes(attr2) && value2[attr2] <= value1.$gt || (attr2 === '$exists' && value2[attr2] === true);
                    var r = (attr2 && (['$lt', '$lte', '$eq'].includes(attr2) && value2[attr2] <= value1.$gt ||
                        attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gt || ele > value1.$gt; }))) || (attr2 === '$exists' && value2[attr2] === false) || ['string', 'number'].includes(typeof value2) && value2 <= value1.$gt);
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    else {
                        if (r) {
                            return true;
                        }
                        return false;
                    }
                }
                case '$gte': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && ((['$gte'].includes(attr2) && value2[attr2] <= value1.$gte
                        || ['$gt'].includes(attr2) && value2[attr2] < value1.$gte) || (attr2 === '$exists' && value2[attr2] === true));
                    var r = (attr2 && (['$lt'].includes(attr2) && value2[attr2] <= value1.$gte
                        || ['$eq', '$lte'].includes(attr2) && value2[attr2] < value1.gte
                        || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gte || ele >= value1.$gte; }) || (attr2 === '$exists' && value2[attr2] === false))) || (['string', 'number'].includes(typeof value2) && value2 < value1.$gte);
                    if (contained) {
                        // 包容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$lt': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && (['$lt', '$lte'].includes(attr2) && value2[attr2] >= value1.$lt || attr2 === '$exists' && value2[attr2] === true);
                    var r = (attr2 && (['$gt', '$gte', '$eq'].includes(attr2) && value2[attr2] >= value1.$lt
                        || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gt || ele < value1.$lt; }) || (attr2 === '$exists' && value2[attr2] === false))) || (['string', 'number'].includes(typeof value2) && value2 >= value1.$lt);
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$lte': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && (['$lte'].includes(attr2) && value2[attr2] >= value1.$lte
                        || ['$lt'].includes(attr2) && value2[attr2] > value1.$lte) || (attr2 === '$exists' && value2[attr2] === true);
                    var r = (attr2 && (['$gt'].includes(attr2) && value2[attr2] >= value1.$lte
                        || ['$eq', '$gte'].includes(attr2) && value2[attr2] > value1.lte
                        || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$lte || ele <= value1.$lte; }) || (attr2 === '$exists' && value2[attr2] === false))) || (['string', 'number'].includes(typeof value2) && value2 > value1.$lte);
                    if (contained) {
                        // 包容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$eq': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = (attr2 && (attr2 === '$eq' && value2[attr2] === value1.$eq || attr2 === '$ne' && value2[attr2] !== value1.$eq
                        || attr2 === '$gt' && value2[attr2] < value1.$eq || attr2 === '$lt' && value2[attr2] > value1.$eq
                        || attr2 === '$gte' && value2[attr2] <= value1.$eq || attr2 === '$lte' && value2[attr2] >= value1.$eq
                        || attr2 === '$startsWith' && value1.$eq.startsWith(value2[attr2])
                        || attr2 === '$endsWith' && value1.$eq.endsWith(value2[attr2])
                        || attr2 === '$includes' && value1.$eq.includes(value2[attr2])
                        || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1.$eq)
                        || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                        || attr2 === '$between' && value2[attr2][0] <= value1.$eq && value2[attr2][1] >= value1.$eq
                        || attr2 === '$exists' && value2[attr2] === true)) || (['string', 'number'].includes(typeof value2) && value2 === value1.$eq);
                    var r = (attr2 && (attr2 === '$eq' && value2[attr2] !== value1.$eq || attr2 === '$gt' && value2[attr2] >= value1.$eq
                        || attr2 === '$lt' && value2[attr2] <= value1.$eq
                        || attr2 === '$gte' && value2[attr2] > value1.$eq || attr2 === '$lte' && value2[attr2] < value1.$eq
                        || attr2 === '$startsWith' && !value1.$eq.startsWith(value2[attr2])
                        || attr2 === '$endsWith' && !value1.$eq.endsWith(value2[attr2])
                        || attr2 === '$includes' && !value1.$eq.includes(value2[attr2])
                        || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                        || attr2 === '$between' && (value2[attr2][0] > value1.$eq || value2[attr2][1] < value1.$eq)
                        || attr2 === '$exists' && value2[attr2] === false)) || value2 !== value1.$eq;
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return undefined;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$ne': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && attr2 === '$ne' && value2[attr2] === value1.$ne;
                    var r = (attr2 === '$eq' && value2[attr2] === value1.$ne) || value2 === value1.$ne;
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$startsWith': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                        && value1.$startsWith.startsWith(value2[attr2]);
                    var r = attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                        && !value1.$startsWith.startsWith(value2[attr2]) && !value2[attr2].startsWith(value1.$startsWith)
                        || attr2 === '$eq' && !value2[attr2].startsWith(value1.$startsWith)
                        || typeof value2 === 'string' && !value2.startsWith(value1.$startsWith);
                    // 这里似乎还有更多情况，但实际中不可能跑到，不处理了
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$endsWith': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                        && value1.$endsWith.endsWith(value2[attr2]);
                    var r = (attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                        && !value1.$endsWith.endsWith(value2[attr2]) && !value2[attr2].endsWith(value1.$endsWith)
                        || attr2 === '$eq' && !value2[attr2].endsWith(value1.$endsWith)) || typeof value2 === 'string' && !value2.endsWith(value1.$endsWith);
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$includes': {
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = (attr2 && ['$includes', '$startsWith', '$endsWith'].includes(attr2)
                        && typeof (value2[attr2]) === 'string'
                        && (value2[attr2]).includes(value1.$includes)) || typeof value2 === 'string' && value2.includes(value1.$includes);
                    var r = (attr2 === '$eq' && !value2[attr2].includes(value1.$includes)
                        || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].find(function (ele) { return ele.includes(value1.$includes); })) || typeof value2 === 'string' && !value2.includes(value1.$includes);
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                default: {
                    (0, assert_1.default)(false, "\u4E0D\u80FD\u5904\u7406\u7684\u7B97\u5B50\u300C".concat(attr, "\u300D"));
                }
            }
        }
        else if (['$exists'].includes(attr)) {
            var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
            var c = attr2 === '$exists' && value2[attr2] === value1.$exists;
            var r = attr2 === '$exists' && value2[attr2] !== value1.$exists;
            if (contained) {
                if (c) {
                    return true;
                }
                else if (r) {
                    return false;
                }
                return;
            }
            if (r) {
                return true;
            }
            return false;
        }
        else if (['$in', '$nin', '$between'].includes(attr)) {
            switch (attr) {
                case '$in': {
                    (0, assert_1.default)(value1.$in instanceof Array);
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = (attr2 === '$in' && value2[attr2] instanceof Array && (0, lodash_1.difference)(value1.$in, value2[attr2]).length === 0) || (attr2 === '$nin' && value2[attr2] instanceof Array && (0, lodash_1.intersection)(value1.$in, value2[attr2]).length === 0) || (attr2 === '$exists' && value2[attr2] === true);
                    if (!c && attr2 && ['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                        var min33_1, max33_1;
                        value1.$in.forEach(function (ele) {
                            if (!min33_1 || min33_1 > ele) {
                                min33_1 = ele;
                            }
                            if (!max33_1 || max33_1 < ele) {
                                max33_1 = ele;
                            }
                        });
                        c = attr2 === '$gt' && value2[attr2] < min33_1 || attr2 === '$gte' && value2[attr2] <= min33_1
                            || attr2 === '$lt' && value2[attr2] > max33_1 || attr2 === '$lte' && value2[attr2] >= max33_1
                            || attr2 === '$between' && value2[attr2][0] < min33_1 && value2[attr2][1] > max33_1;
                    }
                    var r = (attr2 === '$in' && (0, lodash_1.intersection)(value2[attr2], value1.$in).length === 0) || (attr2 === '$eq' && !value1.$in.includes(value2[attr2])) || (attr2 === '$exists' && value2[attr2] === false) || (!value1.$in.includes(value2));
                    if (!r && attr2 && ['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                        var min44_1, max44_1;
                        value1.$in.forEach(function (ele) {
                            if (!min44_1 || min44_1 > ele) {
                                min44_1 = ele;
                            }
                            if (!max44_1 || max44_1 < ele) {
                                max44_1 = ele;
                            }
                        });
                        r = attr2 === '$gt' && value2[attr2] >= max44_1 || attr2 === '$gte' && value2[attr2] > max44_1
                            || attr2 === '$lt' && value2[attr2] <= min44_1 || attr2 === '$lte' && value2[attr2] < min44_1
                            || attr2 === '$between' && (value2[attr2][0] > max44_1 || value2[attr2][1] < min44_1);
                    }
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 相斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$nin': {
                    (0, assert_1.default)(value1.$nin instanceof Array);
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && (attr2 === '$nin' && value2[attr2] instanceof Array && (0, lodash_1.intersection)(value2[attr2], value1.$nin).length === 0
                        || attr2 === '$ne' && value1.$nin.includes(value2[attr2]));
                    var r = attr2 && (attr2 === '$in' && value2[attr2] instanceof Array && (0, lodash_1.intersection)(value2[attr2], value1.$nin).length > 0) || value1.$nin.includes(value2);
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$between': {
                    (0, assert_1.default)(value1.$between instanceof Array);
                    var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    var c = attr2 && (attr2 === '$between' && value2[attr2][0] <= value1.$between[0] && value2[attr2][1] >= value1.$between[1]
                        || attr2 === '$gt' && value2[attr2] < value1.$between[0] || attr2 === '$gte' && value2[attr2] <= value1.$between[0]
                        || attr2 === '$lt' && value2[attr2] > value1.$between[1] || attr2 === '$lte' && value2[attr2] >= value1.$between[1]
                        || attr2 === '$exists' && value2[attr2] === true);
                    var r = attr2 && (attr2 === '$between' && (value2[attr2][0] > value1.$between[1] || value2[attr2][1] < value1.$between[0])
                        || attr2 === '$gt' && value2[attr2] > value1.$between[1] || attr2 === '$gte' && value2[attr2] >= value1.$between[1]
                        || attr2 === '$lt' && value2[attr2] < value1.$between[0] || attr2 === '$lte' && value2[attr2] <= value1.$between[0]
                        || attr2 === '$eq' && (value2[attr2] > value1.$between[1] || value2[attr2] < value1.$between[0])
                        || attr2 === '$exists' && value2[attr2] === false
                        || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].find(function (ele) { return ele >= value1.$between[0] && ele <= value1.$between[1]; })) || value2 > value1.$between[1] || value2 < value1.$between[0];
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 相斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                default: {
                    (0, assert_1.default)(false, "\u6682\u4E0D\u652F\u6301\u7684\u7B97\u5B50".concat(attr));
                }
            }
        }
        else {
            console.warn("\u300CjudgeValueRelation\u300D\u672A\u77E5\u7B97\u5B50\u300C".concat(attr, "\u300D"));
            return false;
        }
    }
    else {
        // value1是一个等值查询
        var attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
        var c = attr2 === '$eq' && value2[attr2] === value1 || attr2 === '$ne' && value2[attr2] !== value1
            || attr2 === '$gt' && value2[attr2] < value1 || attr2 === '$lt' && value2[attr2] > value1
            || attr2 === '$gte' && value2[attr2] <= value1 || attr2 === '$lte' && value2[attr2] >= value1
            || attr2 === '$startsWith' && value1.startsWith(value2[attr2])
            || attr2 === '$endsWith' && value1.endsWith(value2[attr2])
            || attr2 === '$includes' && value1.includes(value2[attr2])
            || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1)
            || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
            || attr2 === '$between' && value2[attr2][0] <= value1 && value2[attr2][1] >= value1
            || attr2 === '$exists' && value2[attr2] === true
            || value2 === value1;
        var r = attr2 === '$eq' && value2[attr2] !== value1 || attr2 === '$gt' && value2[attr2] >= value1
            || attr2 === '$lt' && value2[attr2] <= value1
            || attr2 === '$gte' && value2[attr2] > value1 || attr2 === '$lte' && value2[attr2] < value1
            || attr2 === '$startsWith' && !value1.startsWith(value2[attr2])
            || attr2 === '$endsWith' && !value1.endsWith(value2[attr2])
            || attr2 === '$includes' && !value1.includes(value2[attr2])
            || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
            || attr2 === '$between' && (value2[attr2][0] > value1 || value2[attr2][1] < value1)
            || attr2 === '$exists' && value2[attr2] === false
            || typeof value2 === typeof value1 && value2 !== value1;
        if (contained) {
            // 相容
            if (c) {
                return true;
            }
            else if (r) {
                return false;
            }
            return;
        }
        // 互斥
        if (r) {
            return true;
        }
        return false;
    }
}
exports.judgeValueRelation = judgeValueRelation;
/**
 * 判断filter条件对compared条件上的attr键值的条件是否相容或相斥
 * @param entity
 * @param schema
 * @param attr
 * @param filter
 * @param compared
 * @param contained
 * @returns 返回true说明肯定相容（相斥），返回false说明肯定不相容（相斥），返回undefined说明无法判定相容（相斥），返回DeducedFilterCombination说明需要进一步判断此推断的条件
 */
function judgeFilterSingleAttrRelation(entity, schema, attr, filter, compared, contained) {
    var e_10, _a, _b;
    var comparedFilterAttrValue = compared[attr];
    var orDeducedFilters = [];
    if (attr === 'entityId') {
        // entityId不可能作为查询条件单独存在
        (0, assert_1.default)(compared.hasOwnProperty('entity'));
        return;
    }
    for (var attr2 in filter) {
        if (['$and', '$or', '$not'].includes(attr2)) {
            switch (attr2) {
                case '$and':
                case '$or': {
                    var andDeducedFilters = [];
                    var logicQueries = filter[attr2];
                    var results = logicQueries.map(function (logicQuery) { return judgeFilterSingleAttrRelation(entity, schema, attr, logicQuery, compared, contained); });
                    try {
                        // 如果filter的多个算子是and关系，则只要有一个包含此条件就是包含，只要有一个与此条件相斥就是相斥
                        // 如果filter的多个算子是or关系，则必须所有的条件都包含此条件才是包含，必须所有的条件都与此条件相斥才是相斥                    
                        for (var results_1 = (e_10 = void 0, tslib_1.__values(results)), results_1_1 = results_1.next(); !results_1_1.done; results_1_1 = results_1.next()) {
                            var r = results_1_1.value;
                            if (r === true && attr2 === '$and') {
                                return true;
                            }
                            if (r === false && attr2 === '$or') {
                                return false;
                            }
                            if (r === undefined) {
                                if (attr2 === '$or') {
                                    // or有一个不能确定就返回不确定
                                    return;
                                }
                            }
                            if (typeof r === 'object') {
                                if (attr2 === '$and') {
                                    orDeducedFilters.push(r);
                                }
                                else {
                                    (0, assert_1.default)(attr2 === '$or');
                                    andDeducedFilters.push(r);
                                }
                            }
                        }
                    }
                    catch (e_10_1) { e_10 = { error: e_10_1 }; }
                    finally {
                        try {
                            if (results_1_1 && !results_1_1.done && (_a = results_1.return)) _a.call(results_1);
                        }
                        finally { if (e_10) throw e_10.error; }
                    }
                    if (andDeducedFilters.length > 0) {
                        orDeducedFilters.push({
                            $and: andDeducedFilters,
                        });
                    }
                    break;
                }
                case '$not': {
                    /*
                    * 若filter的not条件被comparedFilterAttrValue条件包容，则说明两者互斥
                    * filter包容comparedFilterAttrValue条件暂时无法由其not条件推论出来
                    */
                    if (!contained) {
                        var logicQuery = filter[attr2];
                        var r = judgeFilterRelation(entity, schema, (_b = {}, _b[attr] = comparedFilterAttrValue, _b), logicQuery, true);
                        if (r === true) {
                            return true;
                        }
                        else if (typeof r === 'object') {
                            orDeducedFilters.push(r);
                        }
                    }
                    break;
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        else if (attr2.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
            // 相当于缩小了filter的查询结果集，若其它条件能判断出来filter与compared[attr]相容或相斥，此条件无影响
        }
        else if (attr2.toLowerCase() === '$text') {
            // 相当于缩小了filter的查询结果集，若其它条件能判断出来filter与compared[attr]相容或相斥，此条件无影响
        }
        else {
            var rel = (0, relation_1.judgeRelation)(schema, entity, attr2);
            if (attr === attr2) {
                if (rel === 1) {
                    var r = judgeValueRelation(filter[attr2], comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                }
                else if (rel === 2) {
                    var r = judgeFilterRelation(attr2, schema, filter[attr2], comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else if (typeof rel === 'string') {
                    var r = judgeFilterRelation(rel, schema, filter[attr2], comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else {
                    // todo 一对多如何判定？
                }
            }
            else if (rel === 2 && attr === 'entity' && comparedFilterAttrValue === attr2 && compared.hasOwnProperty('entityId')) {
                // compared指定了entity和entityId，而filter指定了该entity上的查询条件，此时转而比较此entity上的filter
                var r = judgeFilterRelation(attr2, schema, filter[attr2], {
                    id: compared.entityId
                }, contained);
                if (typeof r === 'boolean') {
                    return r;
                }
                else if (typeof r === 'object') {
                    orDeducedFilters.push(r);
                }
            }
            else if (typeof rel === 'string' && attr === "".concat(attr2, "Id")) {
                // compared指定了外键，而filter指定了该外键对象上的查询条件，此时转而比较此entity上的filter
                var r = judgeFilterRelation(rel, schema, filter[attr2], {
                    id: comparedFilterAttrValue
                }, contained);
                if (typeof r === 'boolean') {
                    return r;
                }
                else if (typeof r === 'object') {
                    orDeducedFilters.push(r);
                }
            }
            else {
                var rel2 = (0, relation_1.judgeRelation)(schema, entity, attr);
                if (rel2 === 2 && attr2 === 'entity' && filter[attr2] === attr && filter.hasOwnProperty('entityId')) {
                    // filter限制了外键范围，而compared指定了该外键对象上的查询条件， 此时转而比较此entity上的filter
                    var r = judgeFilterRelation(attr, schema, {
                        id: filter.entityId,
                    }, comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else if (typeof rel2 === 'string' && attr2 === "".concat(attr, "Id")) {
                    // filter限制了外键范围，而compared指定了该外键对象上的查询条件， 此时转而比较此entity上的filter
                    var r = judgeFilterRelation(rel2, schema, {
                        id: filter[attr2],
                    }, comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
            }
        }
    }
    if (orDeducedFilters.length > 0) {
        return {
            $or: orDeducedFilters,
        };
    }
    // 到这里说明无法直接判断此attr上的相容或者相斥，也无法把判定推断到更深层的算子之上
    return;
}
/** 判断filter条件对compared条件是否相容或相斥
 * @param entity
 * @param schema
 * @param filter
 * @param compared
 * @param contained: true代表判定filter包容compared(filter的查询结果是compared查询结果的子集), false代表判定filter与compared相斥（filter的查询结果与compared没有交集）
 * @returns 返回true说明肯定相容（相斥），返回false说明无法判定相容（相斥），返回DeducedFilterCombination说明需要进一步判断此推断的条件
 */
function judgeFilterRelation(entity, schema, filter, compared, contained) {
    var e_11, _a, e_12, _b;
    var totalAndDeducedFilters = [];
    var totalOrDeducedFilters = [];
    var uncertainAttributes = [];
    var sureAttributes = []; // 对包容查询，肯定此属性可包容；对相斥查询，肯定此属性不相斥
    for (var attr in compared) {
        var result = undefined;
        var deducedCombinations = [];
        if (['$and', '$or', '$not'].includes(attr)) {
            switch (attr) {
                case '$and': {
                    var logicQueries = compared[attr];
                    var results = logicQueries.map(function (logicQuery) { return judgeFilterRelation(entity, schema, filter, logicQuery, contained); });
                    var andDeducedFilters = [];
                    var orDeducedFilters = [];
                    try {
                        for (var results_2 = (e_11 = void 0, tslib_1.__values(results)), results_2_1 = results_2.next(); !results_2_1.done; results_2_1 = results_2.next()) {
                            var r = results_2_1.value;
                            if (contained) {
                                // 如果是包容关系，需要全部被包容，有一个被证伪就已经失败了
                                if (r === false) {
                                    result = false;
                                    break;
                                }
                                else if (r === undefined) {
                                    // 有一个无法判断就放弃
                                    andDeducedFilters.splice(0, andDeducedFilters.length);
                                    result = undefined;
                                    break;
                                }
                                else if (typeof r === 'object') {
                                    andDeducedFilters.push(r);
                                }
                            }
                            else {
                                (0, assert_1.default)(!contained);
                                // 如果是相斥关系，只要和一个相斥就可以，有一个被证实就成功了
                                if (r === true) {
                                    orDeducedFilters.splice(0, orDeducedFilters.length);
                                    result = true;
                                    break;
                                }
                                else if (typeof r === 'object') {
                                    orDeducedFilters.push(r);
                                }
                            }
                        }
                    }
                    catch (e_11_1) { e_11 = { error: e_11_1 }; }
                    finally {
                        try {
                            if (results_2_1 && !results_2_1.done && (_a = results_2.return)) _a.call(results_2);
                        }
                        finally { if (e_11) throw e_11.error; }
                    }
                    if (andDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $and: andDeducedFilters,
                        });
                    }
                    if (orDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $or: orDeducedFilters,
                        });
                    }
                    break;
                }
                case '$or': {
                    var logicQueries = compared[attr];
                    var results = logicQueries.map(function (logicQuery) { return judgeFilterRelation(entity, schema, filter, logicQuery, contained); });
                    var andDeducedFilters = [];
                    var orDeducedFilters = [];
                    try {
                        for (var results_3 = (e_12 = void 0, tslib_1.__values(results)), results_3_1 = results_3.next(); !results_3_1.done; results_3_1 = results_3.next()) {
                            var r = results_3_1.value;
                            if (contained) {
                                // 如果是包容关系，只要包容一个（是其查询子集）就可以
                                if (r === true) {
                                    orDeducedFilters.splice(0, orDeducedFilters.length);
                                    result = true;
                                    break;
                                }
                                else if (typeof r === 'object') {
                                    // 这里不能把or下降到所有的查询中去分别判定，有可能此条件需要多个compared中的情况来共同满足
                                    // orDeducedFilters.push(r);
                                }
                            }
                            else {
                                (0, assert_1.default)(!contained);
                                // 如果是相斥关系，必须和每一个都相斥
                                if (r === false) {
                                    result = false;
                                    break;
                                }
                                else if (r === undefined) {
                                    // 有一个无法判断就放弃
                                    andDeducedFilters.splice(0, andDeducedFilters.length);
                                    result = undefined;
                                    break;
                                }
                                else if (typeof r === 'object') {
                                    andDeducedFilters.push(r);
                                }
                            }
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (results_3_1 && !results_3_1.done && (_b = results_3.return)) _b.call(results_3);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
                    if (andDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $and: andDeducedFilters,
                        });
                    }
                    if (orDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $or: orDeducedFilters,
                        });
                    }
                    break;
                }
                case '$not': {
                    /**
                     * 若filter与compared not所定义的部分相斥，则filter与conditionalFilter相容
                     * 若filter将compared not所定义的部分包容，则filter与conditionalFilter相斥
                     */
                    var logicQuery = compared[attr];
                    if (contained) {
                        var r = judgeFilterRelation(entity, schema, filter, logicQuery, false);
                        if (r === true) {
                            result = true;
                        }
                        else if (typeof r === 'object') {
                            deducedCombinations.push(r);
                        }
                    }
                    else {
                        var r = judgeFilterRelation(entity, schema, filter, logicQuery, true);
                        if (r === true) {
                            result = true;
                        }
                        else if (typeof r === 'object') {
                            deducedCombinations.push(r);
                        }
                    }
                    break;
                }
                default: {
                    throw new Error("\u6682\u4E0D\u652F\u6301\u7684\u903B\u8F91\u7B97\u5B50".concat(attr));
                }
            }
        }
        else if (attr.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
            // 相当于缩小了compared查询结果，如果是判定相斥，对结果无影响，如果是判定相容，则认为无法判定，
            if (contained) {
                result = undefined;
            }
        }
        else if (attr.toLowerCase() === '$text') {
            // 相当于缩小了compared查询结果，如果是判定相斥，对结果无影响，如果是判定相容，则认为无法判定，
            if (contained) {
                result = undefined;
            }
        }
        else {
            var r = judgeFilterSingleAttrRelation(entity, schema, attr, filter, compared, contained);
            if (typeof r === 'object') {
                deducedCombinations.push(r);
            }
            else {
                result = r;
            }
        }
        if (contained) {
            // 相容必须compared中的每个属性都被相容
            if (result === true) {
                sureAttributes.push(attr);
            }
            else if (result === false) {
                return false;
            }
            else if (deducedCombinations.length > 0) {
                totalAndDeducedFilters.push.apply(totalAndDeducedFilters, tslib_1.__spreadArray([], tslib_1.__read(deducedCombinations), false));
            }
            else {
                // 判定不了，也推断不了
                uncertainAttributes.push(attr);
            }
        }
        else {
            // 相斥只要有一个被肻定就可以返回true了
            if (result === true) {
                return true;
            }
            else if (result === false) {
                sureAttributes.push(attr);
            }
            else if (deducedCombinations.length > 0) {
                totalOrDeducedFilters.push.apply(totalOrDeducedFilters, tslib_1.__spreadArray([], tslib_1.__read(deducedCombinations), false));
            }
            else {
                // 判定不了，也推断不了
                uncertainAttributes.push(attr);
            }
        }
    }
    if (contained) {
        if (sureAttributes.length === Object.keys(compared).length) {
            return true;
        }
        if (uncertainAttributes.length > 0) {
            // 有属性无法界定，此时只能拿本行去查询
            totalAndDeducedFilters.push({
                entity: entity,
                filter: combineFilters(entity, schema, [filter, {
                        $not: (0, lodash_1.pick)(compared, uncertainAttributes),
                    }]),
            });
        }
        return {
            $and: totalAndDeducedFilters,
        };
    }
    else {
        if (sureAttributes.length === Object.keys(compared).length) {
            return false;
        }
        // uncertainAttributes中是无法判定的属性，和filter合并之后（同时满足）的查询结果如果不为空说明不互斥
        if (uncertainAttributes.length > 0) {
            totalOrDeducedFilters.push({
                entity: entity,
                filter: combineFilters(entity, schema, [filter, (0, lodash_1.pick)(compared, uncertainAttributes)]),
            });
        }
        return {
            $or: totalOrDeducedFilters,
        };
    }
}
/**
 *
 * 判断filter是否包含contained中的查询条件，即filter查询的结果一定是contained查询结果的子集
 * filter = {
 *      a: 1
 *      b: 2,
 *      c: 3,
 * },
 * conditionalFilter = {
 *      a: 1
 * }
 * 则包含
 * @param entity
 * @param schema
 * @param filter
 * @param contained
 * @returns
 */
function contains(entity, schema, filter, contained) {
    (0, assert_1.default)(filter);
    (0, assert_1.default)(contained);
    return judgeFilterRelation(entity, schema, filter, contained, true);
    // return false;
}
exports.contains = contains;
/**
 * 判断filter1和filter2是否相斥，即filter1和filter2查询的结果一定没有交集
 * filter1 = {
 *      a: 2
 * },
 * filter2 = {
 *      a: 1
 * }
 * 则包含
 * @param entity
 * @param schema
 * @param filter
 * @param conditionalFilter
 */
function repel(entity, schema, filter1, filter2) {
    (0, assert_1.default)(filter1);
    (0, assert_1.default)(filter2);
    return judgeFilterRelation(entity, schema, filter1, filter2, false);
    // return false;
}
exports.repel = repel;
/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter
 * @returns
 */
function getRelevantIds(filter) {
    var _a, _b;
    var ids;
    var idsAnd;
    var idsOr;
    if (!filter) {
        return [];
    }
    // 因为要准确判定id，如果有其它的过滤条件，可能会使实际处理的行数少于id指向的行数，只能返回空数组
    var attrs = Object.keys(filter);
    if ((0, lodash_1.intersection)(attrs, ['id', '$and', '$or']).length > 3) {
        return [];
    }
    if (filter === null || filter === void 0 ? void 0 : filter.$and) {
        var idss = filter.$and.map(function (ele) { return getRelevantIds(ele); });
        idsAnd = lodash_1.intersection.apply(void 0, tslib_1.__spreadArray([], tslib_1.__read(idss), false));
    }
    if (filter === null || filter === void 0 ? void 0 : filter.$or) {
        var idss = filter.$or.map(function (ele) { return getRelevantIds(ele); });
        idsOr = lodash_1.union.apply(void 0, tslib_1.__spreadArray([], tslib_1.__read(idss), false));
    }
    if (filter === null || filter === void 0 ? void 0 : filter.id) {
        if (typeof filter.id === 'string') {
            ids = [filter.id];
        }
        if ((_a = filter.id) === null || _a === void 0 ? void 0 : _a.$eq) {
            ids = [filter.id.$eq];
        }
        if (((_b = filter.id) === null || _b === void 0 ? void 0 : _b.$in) && filter.id.$in instanceof Array) {
            ids = filter.id.$in;
        }
    }
    // 三者如果有基一，直接返回，如果大于一返回intersection
    if (!ids && !idsAnd && !idsOr) {
        return [];
    }
    var result = (ids || idsAnd || idsOr);
    if (ids) {
        result = (0, lodash_1.intersection)(result, ids);
    }
    if (idsAnd) {
        result = (0, lodash_1.intersection)(result, idsAnd);
    }
    if (idsOr) {
        result = (0, lodash_1.intersection)(result, idsOr);
    }
    return result;
}
exports.getRelevantIds = getRelevantIds;
/**
 * 判断两个过滤条件是否完全一致
 * @param entity
 * @param schema
 * @param filter1
 * @param filter2
 */
function same(entity, schema, filter1, filter2) {
    // 当前只需要判断是不是id相等就行了，在runningTree的operation合并的时间使用
    if (!filter1 || !filter1.id || Object.keys(filter1).length > 1 || !filter2 || !filter2.id || Object.keys(filter2).length > 1) {
        return false;
    }
    return filter1.id === filter2.id;
}
exports.same = same;
/**
 * 寻找在树形结构中满足条件的数据行的上层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更高层的“浙江省”和“中国”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
function makeTreeAncestorFilter(entity, parentKey, filter, level, includeAll, includeSelf) {
    var _a;
    if (level === void 0) { level = 1; }
    (0, assert_1.default)(level >= 0);
    var idInFilters = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    var currentLevelInFilter = filter;
    while (level > 0) {
        currentLevelInFilter = {
            id: {
                $in: {
                    entity: entity,
                    data: (_a = {},
                        _a[parentKey] = 1,
                        _a),
                    filter: currentLevelInFilter,
                }
            },
        };
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    }
    ;
    if (includeAll) {
        return {
            $or: idInFilters,
        };
    }
    return currentLevelInFilter;
}
exports.makeTreeAncestorFilter = makeTreeAncestorFilter;
/**
 * 寻找在树形结构中满足条件的数据行的下层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更低层的“西湖区”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
function makeTreeDescendantFilter(entity, parentKey, filter, level, includeAll, includeSelf) {
    var _a;
    if (level === void 0) { level = 1; }
    (0, assert_1.default)(level >= 0);
    (0, assert_1.default)(parentKey.endsWith('Id'));
    var parentKeyRef = parentKey.slice(0, parentKey.length - 2);
    var idInFilters = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    var currentLevelInFilter = filter;
    while (level > 0) {
        currentLevelInFilter = (_a = {},
            _a[parentKeyRef] = currentLevelInFilter,
            _a);
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    }
    ;
    if (includeAll) {
        return {
            $or: idInFilters,
        };
    }
    return currentLevelInFilter;
}
exports.makeTreeDescendantFilter = makeTreeDescendantFilter;
function checkDeduceFilters(dfc, context) {
    var e_13, _a, e_14, _b;
    var $and = dfc.$and, $or = dfc.$or;
    if ($and) {
        (0, assert_1.default)(!$or);
        var andResult = $and.map(function (ele) {
            if (ele.hasOwnProperty('entity')) {
                var ele2_1 = ele;
                return context.count(ele2_1.entity, {
                    filter: ele2_1.filter
                }, {});
            }
            var ele2 = ele;
            return checkDeduceFilters(ele2, context);
        });
        // and 意味着只要有一个条件失败就返回false
        if (andResult.find(function (ele) { return ele instanceof Promise; })) {
            return Promise.all(andResult).then(function (ar) {
                var e_15, _a;
                try {
                    for (var ar_1 = tslib_1.__values(ar), ar_1_1 = ar_1.next(); !ar_1_1.done; ar_1_1 = ar_1.next()) {
                        var ele = ar_1_1.value;
                        if (ele === false || typeof ele === 'number' && ele > 0) {
                            return false;
                        }
                    }
                }
                catch (e_15_1) { e_15 = { error: e_15_1 }; }
                finally {
                    try {
                        if (ar_1_1 && !ar_1_1.done && (_a = ar_1.return)) _a.call(ar_1);
                    }
                    finally { if (e_15) throw e_15.error; }
                }
                return true;
            });
        }
        try {
            for (var andResult_1 = tslib_1.__values(andResult), andResult_1_1 = andResult_1.next(); !andResult_1_1.done; andResult_1_1 = andResult_1.next()) {
                var ele = andResult_1_1.value;
                if (ele === false || typeof ele === 'number' && ele > 0) {
                    return false;
                }
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (andResult_1_1 && !andResult_1_1.done && (_a = andResult_1.return)) _a.call(andResult_1);
            }
            finally { if (e_13) throw e_13.error; }
        }
        return true;
    }
    (0, assert_1.default)($or);
    var orResult = $or.map(function (ele) {
        if (ele.hasOwnProperty('entity')) {
            var ele2_2 = ele;
            return context.count(ele2_2.entity, {
                filter: ele2_2.filter
            }, {});
        }
        var ele2 = ele;
        return checkDeduceFilters(ele2, context);
    });
    // or只要有一个条件通过就返回true
    if (orResult.find(function (ele) { return ele instanceof Promise; })) {
        return Promise.all(orResult).then(function (or) {
            var e_16, _a;
            try {
                for (var or_1 = tslib_1.__values(or), or_1_1 = or_1.next(); !or_1_1.done; or_1_1 = or_1.next()) {
                    var ele = or_1_1.value;
                    if (ele === true || ele === 0) {
                        return true;
                    }
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (or_1_1 && !or_1_1.done && (_a = or_1.return)) _a.call(or_1);
                }
                finally { if (e_16) throw e_16.error; }
            }
            return false;
        });
    }
    try {
        for (var orResult_1 = tslib_1.__values(orResult), orResult_1_1 = orResult_1.next(); !orResult_1_1.done; orResult_1_1 = orResult_1.next()) {
            var ele = orResult_1_1.value;
            if (ele === true || ele === 0) {
                return true;
            }
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (orResult_1_1 && !orResult_1_1.done && (_b = orResult_1.return)) _b.call(orResult_1);
        }
        finally { if (e_14) throw e_14.error; }
    }
    return false;
}
exports.checkDeduceFilters = checkDeduceFilters;
/**
 * 检查filter是否包含contained（filter查询的数据是contained查询数据的子集）
 * @param entity
 * @param context
 * @param contained
 * @param filter
 * @param dataCompare
 * @returns
 */
function checkFilterContains(entity, context, contained, filter, dataCompare) {
    if (!filter) {
        throw new types_1.OakRowInconsistencyException();
    }
    var schema = context.getSchema();
    var result = contains(entity, schema, filter, contained);
    if (typeof result === 'boolean') {
        return result;
    }
    if (dataCompare) {
        return checkDeduceFilters(result, context);
    }
    return false;
}
exports.checkFilterContains = checkFilterContains;
function checkFilterRepel(entity, context, filter1, filter2, dataCompare) {
    if (!filter2) {
        throw new types_1.OakRowInconsistencyException();
    }
    var schema = context.getSchema();
    var result = repel(entity, schema, filter2, filter1);
    if (typeof result === 'boolean') {
        return result;
    }
    if (dataCompare) {
        return checkDeduceFilters(result, context);
    }
    return false;
}
exports.checkFilterRepel = checkFilterRepel;
/* export function getCascadeEntityFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    filter: NonNullable<ED[T]['Selection']['filter']>,
    attr: keyof NonNullable<ED[T]['Selection']['filter']>
): ED[keyof ED]['Selection']['filter'] {
    const filters: ED[keyof ED]['Selection']['filter'][] = [];
    if (filter![attr]) {
        assert(typeof filter![attr] === 'object');
        filters.push(filter![attr]);
    }
    if (filter.$and) {
        filter.$and.forEach(
            (ele: NonNullable<ED[T]['Selection']['filter']>) => {
                const f2 = getCascadeEntityFilter(ele, attr);
                if (f2) {
                    filters.push(f2)
                }
            }
        );
    }
    if (filters.length > 0) {
        return combineFilters(filters);
    }
} */ 
