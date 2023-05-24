"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCascadeEntityFilter = exports.checkFilterRepel = exports.checkFilterContains = exports.makeTreeDescendantFilter = exports.makeTreeAncestorFilter = exports.same = exports.getRelevantIds = exports.repel = exports.contains = exports.judgeValueRelation = exports.combineFilters = exports.unionFilterSegment = exports.addFilterSegment = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var lodash_1 = require("../utils/lodash");
var relation_1 = require("./relation");
function addFilterSegment() {
    var filters = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        filters[_i] = arguments[_i];
    }
    var filter;
    filters.forEach(function (ele) {
        var _a, _b, _c;
        if (ele) {
            if (!filter) {
                filter = {};
            }
            for (var k in ele) {
                if (k === '$and') {
                    if (filter.$and) {
                        (_a = filter.$and).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(ele[k]), false));
                    }
                    else {
                        filter.$and = ele[k];
                    }
                }
                else if (filter.hasOwnProperty(k)) {
                    if (filter.$and) {
                        filter.$and.push((_b = {},
                            _b[k] = ele[k],
                            _b));
                    }
                    else {
                        filter.$and = [
                            (_c = {},
                                _c[k] = ele[k],
                                _c)
                        ];
                    }
                }
                else {
                    filter[k] = ele[k];
                }
            }
        }
    });
    return filter;
}
exports.addFilterSegment = addFilterSegment;
function unionFilterSegment() {
    var e_1, _a;
    var filters = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        filters[_i] = arguments[_i];
    }
    var allOnlyOneOr = true;
    try {
        for (var filters_1 = tslib_1.__values(filters), filters_1_1 = filters_1.next(); !filters_1_1.done; filters_1_1 = filters_1.next()) {
            var f = filters_1_1.value;
            if (Object.keys(f).length > 1 || !f.$or) {
                allOnlyOneOr = false;
                break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (filters_1_1 && !filters_1_1.done && (_a = filters_1.return)) _a.call(filters_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (allOnlyOneOr) {
        // 优化特殊情况，全部都是$or，直接合并
        var ors = filters.map(function (ele) { return ele.$or; });
        return {
            $or: ors.reduce(function (prev, next) { return prev.concat(next); }, [])
        };
    }
    return {
        $or: filters,
    };
}
exports.unionFilterSegment = unionFilterSegment;
function combineFilters(filters, union) {
    if (union) {
        return unionFilterSegment.apply(void 0, tslib_1.__spreadArray([], tslib_1.__read(filters), false));
    }
    return addFilterSegment.apply(void 0, tslib_1.__spreadArray([], tslib_1.__read(filters), false));
}
exports.combineFilters = combineFilters;
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
 * @attention: 1)这里的测试不够充分，有些算子之间的相容或相斥可能有遗漏, 2)有新的算子加入需要修改代码
 */
function judgeValueRelation(value1, value2, contained) {
    if (typeof value1 === 'object') {
        var attr = Object.keys(value1)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne', '$startsWith', '$endsWith', '$includes'].includes(attr)) {
            switch (attr) {
                case '$gt': {
                    if (contained) {
                        // 包容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return ['$gt', '$gte'].includes(attr2) && value2[attr2] <= value1.$gt;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return ['$lt', '$lte', '$eq'].includes(attr2) && value2[attr2] <= value1.$gt
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gt || ele > value1.$gt; }));
                    }
                    return value2 <= value1.$gt;
                }
                case '$gte': {
                    if (contained) {
                        // 包容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return ['$gte'].includes(attr2) && value2[attr2] <= value1.$gte
                                || ['$gt'].includes(attr2) && value2[attr2] < value1.$gte;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return ['$lt'].includes(attr2) && value2[attr2] <= value1.$gte
                            || ['$eq', '$lte'].includes(attr2) && value2[attr2] < value1.gte
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gte || ele >= value1.$gte; }));
                    }
                    return value2 < value1.$gte;
                }
                case '$lt': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return ['$lt', '$lte'].includes(attr2) && value2[attr2] >= value1.$lt;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return ['$gt', '$gte', '$eq'].includes(attr2) && value2[attr2] >= value1.$lt
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gt || ele < value1.$lt; }));
                    }
                    return value2 >= value1.$gt;
                }
                case '$lte': {
                    if (contained) {
                        // 包容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return ['$lte'].includes(attr2) && value2[attr2] >= value1.$lte
                                || ['$lt'].includes(attr2) && value2[attr2] > value1.$lte;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return ['$gt'].includes(attr2) && value2[attr2] >= value1.$lte
                            || ['$eq', '$gte'].includes(attr2) && value2[attr2] > value1.lte
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$lte || ele <= value1.$lte; }));
                    }
                    return value2 > value1.$gte;
                }
                case '$eq': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return attr2 === '$eq' && value2[attr2] === value1.$eq || attr2 === '$ne' && value2[attr2] !== value1.$eq
                                || attr2 === '$gt' && value2[attr2] < value1.$eq || attr2 === '$lt' && value2[attr2] > value1.$eq
                                || attr2 === '$gte' && value2[attr2] <= value1.$eq || attr2 === '$lte' && value2[attr2] >= value1.$eq
                                || attr2 === '$startsWith' && value1.$eq.startsWith(value2[attr2])
                                || attr2 === '$endsWith' && value1.$eq.endsWith(value2[attr2])
                                || attr2 === '$includes' && value1.$eq.includes(value2[attr2])
                                || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1.$eq)
                                || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                                || attr2 === '$between' && value2[attr2][0] <= value1.$eq && value2[attr2][1] >= value1.$eq
                                || attr2 === '$exists' && value2[attr2] === true;
                        }
                        return value2 === value1.$eq;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && value2[attr2] !== value1.$eq || attr2 === '$gt' && value2[attr2] >= value1.$eq
                            || attr2 === '$lt' && value2[attr2] <= value1.$eq
                            || attr2 === '$gte' && value2[attr2] > value1.$eq || attr2 === '$lte' && value2[attr2] < value1.$eq
                            || attr2 === '$startsWith' && !value1.$eq.startsWith(value2[attr2])
                            || attr2 === '$endsWith' && !value1.$eq.endsWith(value2[attr2])
                            || attr2 === '$includes' && !value1.$eq.includes(value2[attr2])
                            || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                            || attr2 === '$between' && (value2[attr2][0] > value1.$eq || value2[attr2][1] < value1.$eq)
                            || attr2 === '$exists' && value2[attr2] === false;
                    }
                    return value2 !== value1.$eq;
                }
                case '$ne': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return attr2 === '$ne' && value2[attr2] === value1.$ne;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && value2[attr2] === value1.$ne;
                    }
                    return value2 === value1.$ne;
                }
                case '$startsWith': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                                && value1.$startsWith.startsWith(value2[attr2]);
                        }
                        return typeof value2 === 'string' && value1.$startsWith.startsWith(value2);
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                            && !value1.$startsWith.startsWith(value2[attr2]) && !value2[attr2].startsWith(value1.$startsWith)
                            || attr2 === '$eq' && !value2[attr2].startsWith(value1.$startsWith);
                    }
                    return !value2.startsWith(value1.$startsWith);
                }
                case '$endsWith': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                                && value1.$startsWith.endsWith(value2[attr2]);
                        }
                        return typeof value2 === 'string' && value1.$startsWith.endsWith(value2);
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                            && !value1.$startsWith.endsWith(value2[attr2]) && !value2[attr2].endsWith(value1.$startsWith)
                            || attr2 === '$eq' && !value2[attr2].endsWith(value1.$startsWith);
                    }
                    return !value2.endsWith(value1.$startsWith);
                }
                case '$includes': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return ['$includes', '$startsWith', '$endsWith'].includes(attr2)
                                && typeof (value2[attr2]) === 'string'
                                && (value2[attr2]).includes(value1.$includes);
                        }
                        return typeof value2 === 'string' && value2.includes(value1.$includes);
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && !value2[attr2].includes(value1.$includes)
                            || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].find(function (ele) { return ele.includes(value1.$includes); });
                    }
                    return typeof value2 === 'string' && !value2.includes(value1.$includes);
                }
                default: {
                    (0, assert_1.default)(false, "\u4E0D\u80FD\u5904\u7406\u7684\u7B97\u5B50\u300C".concat(attr, "\u300D"));
                }
            }
        }
        else if (['$exists'].includes(attr)) {
            (0, assert_1.default)(attr === '$exists');
            if (contained) {
                if (typeof value2 === 'object') {
                    var attr2 = Object.keys(value2)[0];
                    return attr2 === '$exists' && value2[attr2] === value1.$exists;
                }
                return false;
            }
            return typeof value2 === 'object' && value2.$exists === !(value1.$exists);
        }
        else if (['$in', '$nin', '$between'].includes(attr)) {
            switch (attr) {
                case '$in': {
                    if (contained) {
                        // 相容
                        if (value1.$in instanceof Array) {
                            if (typeof value2 === 'object') {
                                var attr2 = Object.keys(value2)[0];
                                if (attr2 === '$in') {
                                    return value2[attr2] instanceof Array && (0, lodash_1.difference)(value1.$in, value2[attr2]).length === 0;
                                }
                                else if (attr2 === '$nin') {
                                    return value2[attr2] instanceof Array && (0, lodash_1.intersection)(value1.$in, value2[attr2]).length === 0;
                                }
                                else if (attr2 === '$exists') {
                                    return value2[attr2] === true;
                                }
                                else if (['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                                    var min33_1, max33_1;
                                    value1.$in.forEach(function (ele) {
                                        if (!min33_1 || min33_1 > ele) {
                                            min33_1 = ele;
                                        }
                                        if (!max33_1 || max33_1 < ele) {
                                            max33_1 = ele;
                                        }
                                    });
                                    return attr2 === '$gt' && value2[attr2] < min33_1 || attr2 === '$gte' && value2[attr2] <= min33_1
                                        || attr2 === '$lt' && value2[attr2] > max33_1 || attr2 === '$lte' && value2[attr2] >= max33_1
                                        || attr2 === '$between' && value2[attr2][0] < min33_1 && value2[attr2][1] > max33_1;
                                }
                            }
                        }
                        return false;
                    }
                    // 相斥
                    if (value1.$in instanceof Array) {
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            if (attr2 === '$in') {
                                return (0, lodash_1.intersection)(value2[attr2], value1.$in).length === 0;
                            }
                            else if (attr2 === '$eq') {
                                return !value1.$in.includes(value2[attr2]);
                            }
                            else if (attr2 === '$exists') {
                                return value2[attr2] === false;
                            }
                            else if (['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                                var min44_1, max44_1;
                                value1.$in.forEach(function (ele) {
                                    if (!min44_1 || min44_1 > ele) {
                                        min44_1 = ele;
                                    }
                                    if (!max44_1 || max44_1 < ele) {
                                        max44_1 = ele;
                                    }
                                });
                                return attr2 === '$gt' && value2[attr2] >= max44_1 || attr2 === '$gte' && value2[attr2] > max44_1
                                    || attr2 === '$lt' && value2[attr2] <= min44_1 || attr2 === '$lte' && value2[attr2] < min44_1
                                    || attr2 === '$between' && (value2[attr2][0] > max44_1 || value2[attr2][1] < min44_1);
                            }
                        }
                        return !value1.$in.includes(value2);
                    }
                    return false;
                }
                case '$nin': {
                    if (contained) {
                        // 相容
                        if (value1.$nin instanceof Array) {
                            if (typeof value2 === 'object') {
                                var attr2 = Object.keys(value2)[0];
                                if (attr2 === '$nin') {
                                    return value2[attr2] instanceof Array && (0, lodash_1.intersection)(value2[attr2], value1.$nin).length === 0;
                                }
                            }
                        }
                        return false;
                    }
                    // 相斥
                    if (value1.$nin instanceof Array) {
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            if (attr2 === '$in') {
                                return value2[attr2] instanceof Array && (0, lodash_1.difference)(value2[attr2], value1.$nin).length === 0;
                            }
                        }
                    }
                    return false;
                }
                case '$between': {
                    (0, assert_1.default)(value1.$between instanceof Array);
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            if (['$gt', '$gte', '$lt', '$lte', '$between', '$eq'].includes(attr2)) {
                                return attr2 === '$between' && value2[attr2][0] <= value1.$between[0] && value2[attr2][1] >= value1.$between[1]
                                    || attr2 === '$gt' && value2[attr2] < value1.$between[0] || attr2 === '$gte' && value2[attr2] <= value1.$between[0]
                                    || attr2 === '$lt' && value2[attr2] > value1.$between[1] || attr2 === '$lte' && value2[attr2] >= value1.$between[1];
                            }
                            else if (attr2 === '$exists') {
                                return value2[attr2] === true;
                            }
                        }
                        return false;
                    }
                    // 相斥
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        if (['$gt', '$gte', '$lt', '$lte', '$between', '$eq'].includes(attr2)) {
                            return attr2 === '$between' && (value2[attr2][0] > value1.$between[1] || value2[attr2][1] < value1.$between[0])
                                || attr2 === '$gt' && value2[attr2] > value1.$between[1] || attr2 === '$gte' && value2[attr2] >= value1.$between[1]
                                || attr2 === '$lt' && value2[attr2] < value1.$between[0] || attr2 === '$lte' && value2[attr2] <= value1.$between[0]
                                || attr2 === '$eq' && (value2[attr2] > value1.$between[1] || value2[attr2] < value1.$between[0]);
                        }
                        else if (attr2 === '$exists') {
                            return value2[attr2] === false;
                        }
                        else if (attr2 === '$in' && value2[attr2] instanceof Array) {
                            return !value2[attr2].find(function (ele) { return ele >= value1.$between[0] && ele <= value1.$between[1]; });
                        }
                        return false;
                    }
                }
                default: {
                    (0, assert_1.default)(false, "\u6682\u4E0D\u652F\u6301\u7684\u7B97\u5B50".concat(attr));
                }
            }
        }
        else {
            return false;
        }
    }
    else {
        // value1是一个等值查询
        if (contained) {
            // 相容
            if (typeof value2 === 'object') {
                var attr2 = Object.keys(value2)[0];
                return attr2 === '$eq' && value2[attr2] === value1 || attr2 === '$ne' && value2[attr2] !== value1
                    || attr2 === '$gt' && value2[attr2] < value1 || attr2 === '$lt' && value2[attr2] > value1
                    || attr2 === '$gte' && value2[attr2] <= value1 || attr2 === '$lte' && value2[attr2] >= value1
                    || attr2 === '$startsWith' && value1.startsWith(value2[attr2])
                    || attr2 === '$endsWith' && value1.endsWith(value2[attr2])
                    || attr2 === '$includes' && value1.includes(value2[attr2])
                    || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1)
                    || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
                    || attr2 === '$between' && value2[attr2][0] <= value1 && value2[attr2][1] >= value1
                    || attr2 === '$exists' && value2[attr2] === true;
            }
            return value2 === value1;
        }
        // 互斥
        if (typeof value2 === 'object') {
            var attr2 = Object.keys(value2)[0];
            return attr2 === '$eq' && value2[attr2] !== value1 || attr2 === '$gt' && value2[attr2] >= value1
                || attr2 === '$lt' && value2[attr2] <= value1
                || attr2 === '$gte' && value2[attr2] > value1 || attr2 === '$lte' && value2[attr2] < value1
                || attr2 === '$startsWith' && !value1.startsWith(value2[attr2])
                || attr2 === '$endsWith' && !value1.endsWith(value2[attr2])
                || attr2 === '$includes' && !value1.includes(value2[attr2])
                || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
                || attr2 === '$between' && (value2[attr2][0] > value1 || value2[attr2][1] < value1)
                || attr2 === '$exists' && value2[attr2] === false;
        }
        return value2 !== value1;
    }
}
exports.judgeValueRelation = judgeValueRelation;
function judgeFilter2ValueRelation(entity, schema, attr, filter, conditionalFilterAttrValue, contained) {
    var _a;
    for (var attr2 in filter) {
        if (['$and', '$or', '$not'].includes(attr2)) {
            switch (attr2) {
                case '$and':
                case '$or':
                case '$xor': {
                    var logicQueries = filter[attr2];
                    var results = logicQueries.map(function (logicQuery) { return judgeFilter2ValueRelation(entity, schema, attr, logicQuery, conditionalFilterAttrValue, contained); });
                    // 如果filter的多个算子是and关系，则只要有一个包含此条件就是包含，只要有一个与此条件相斥就是相斥
                    // 如果filter的多个算子是or关系，则必须所有的条件都包含此条件才是包含，必须所有的条件都与此条件相斥才是相斥                    
                    if (attr2 === '$and') {
                        if (results.includes(true)) {
                            return true;
                        }
                    }
                    else if (attr2 === '$or') {
                        if (!results.includes(false)) {
                            return true;
                        }
                    }
                    else {
                        (0, assert_1.default)(false);
                    }
                    break;
                }
                case '$not': {
                    /*
                    * 若filter的not条件被conditionalFilterAttrValue条件包容，则说明两者互斥
                    * filter包容conditionalFilterAttrValue条件暂时无法由其not条件推论出来
                    */
                    var logicQuery = filter[attr2];
                    if (!contained && judgeFilterRelation(entity, schema, logicQuery, (_a = {}, _a[attr] = conditionalFilterAttrValue, _a), true)) {
                        return true;
                    }
                    break;
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        else if (attr2.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
            return false;
        }
        else if (attr2.toLowerCase() === '$text') {
            return false;
        }
        else {
            if (attr === attr2) {
                var rel = (0, relation_1.judgeRelation)(schema, entity, attr2);
                if (rel === 1) {
                    return judgeValueRelation(filter[attr2], conditionalFilterAttrValue, contained);
                }
                else if (rel === 2) {
                    return judgeFilterRelation(attr2, schema, filter[attr2], conditionalFilterAttrValue, contained);
                }
                else if (typeof rel === 'string') {
                    return judgeFilterRelation(rel, schema, filter[attr2], conditionalFilterAttrValue, contained);
                }
                else {
                    (0, assert_1.default)(false);
                }
            }
        }
    }
    // 到这里说明无法判断相容或者相斥，安全起见全返回false
    return false;
}
/**
 * @param entity
 * @param schema
 * @param filter
 * @param conditionalFilter
 * @param contained: true代表filter包容conditionalFilter, false代表filter与conditionalFilter相斥
 */
function judgeFilterRelation(entity, schema, filter, conditionalFilter, contained) {
    for (var attr in conditionalFilter) {
        if (['$and', '$or', '$not'].includes(attr)) {
            switch (attr) {
                case '$and':
                case '$or': {
                    var logicQueries = conditionalFilter[attr];
                    var results = logicQueries.map(function (logicQuery) { return judgeFilterRelation(entity, schema, filter, logicQuery, contained); });
                    if (contained) {
                        // 如果是包容关系，or和and需要全部被包容
                        if (results.includes(false)) {
                            return false;
                        }
                    }
                    else if (!contained) {
                        // 如果是相斥关系，and只需要和一个相斥，or需要和全部相斥
                        if (attr === '$and' && results.includes(true) || attr === '$or' && !results.includes(false)) {
                            return true;
                        }
                    }
                    else {
                        (0, assert_1.default)(false);
                    }
                    break;
                }
                case '$not': {
                    /**
                     * 若filter与conditionalFilter not所定义的部分相斥，则filter与conditionalFilter相容
                     * 若filter将conditionalFilter not所定义的部分包容，则filter与conditionalFilter相斥
                     */
                    var logicQuery = conditionalFilter[attr];
                    if (contained) {
                        if (!judgeFilterRelation(entity, schema, filter, logicQuery, false)) {
                            return false;
                        }
                    }
                    else {
                        if (judgeFilterRelation(entity, schema, filter, logicQuery, true)) {
                            return true;
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
            return false;
        }
        else if (attr.toLowerCase() === '$text') {
            return false;
        }
        else {
            if (contained && !judgeFilter2ValueRelation(entity, schema, attr, filter, conditionalFilter[attr], contained)) {
                // 相容关系只要有一个不相容就不相容
                return false;
            }
            if (!contained && judgeFilter2ValueRelation(entity, schema, attr, filter, conditionalFilter[attr], contained)) {
                // 相斥关系只要有一个相斥就相斥
                return true;
            }
        }
    }
    // 到这里说明不能否定其相容（所以要返回相容），也不能肯定其相斥（所以要返回不相斥）
    return contained;
}
/**
 *
 * 判断filter是否包含conditionalFilter中的查询条件，即filter查询的结果一定满足conditionalFilter的约束
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
 * @param conditionalFilter
 * @returns
 */
function contains(entity, schema, filter, conditionalFilter) {
    return judgeFilterRelation(entity, schema, filter, conditionalFilter, true);
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
    // todo
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
/**
 * 检查filter是否包含contained（filter查询的数据一定满足contained）
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
    // 优先判断两个条件是否相容
    if (contains(entity, schema, filter, contained)) {
        return true;
    }
    if (dataCompare) {
        // 再判断加上了conditionalFilter后取得的行数是否缩减
        var filter2 = combineFilters([filter, {
                $not: contained,
            }]);
        var count = context.count(entity, {
            filter: filter2,
            count: 1,
        }, {
            dontCollect: true,
            blockTrigger: true,
        });
        if (count instanceof Promise) {
            return count.then(function (count2) { return count2 === 0; });
        }
        return count === 0;
    }
    return false;
}
exports.checkFilterContains = checkFilterContains;
function checkFilterRepel(entity, context, filter1, filter2, dataCompare) {
    if (!filter2) {
        throw new types_1.OakRowInconsistencyException();
    }
    var schema = context.getSchema();
    // 优先判断两个条件是否相容
    if (repel(entity, schema, filter2, filter1)) {
        return true;
    }
    // 再判断两者同时成立时取得的行数是否为0
    if (dataCompare) {
        var filter3 = combineFilters([filter2, filter1]);
        var count = context.count(entity, {
            filter: filter3,
        }, {
            dontCollect: true,
            blockTrigger: true,
        });
        if (count instanceof Promise) {
            return count.then(function (count2) { return count2 === 0; });
        }
        return count === 0;
    }
    return false;
}
exports.checkFilterRepel = checkFilterRepel;
function getCascadeEntityFilter(filter, attr) {
    var filters = [];
    if (filter[attr]) {
        (0, assert_1.default)(typeof filter[attr] === 'object');
        filters.push(filter[attr]);
    }
    if (filter.$and) {
        filter.$and.forEach(function (ele) {
            var f2 = getCascadeEntityFilter(ele, attr);
            if (f2) {
                filters.push(f2);
            }
        });
    }
    if (filters.length > 0) {
        return combineFilters(filters);
    }
}
exports.getCascadeEntityFilter = getCascadeEntityFilter;
