"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFilterContains = exports.makeTreeDescendantFilter = exports.makeTreeAncestorFilter = exports.same = exports.getRelevantIds = exports.repel = exports.contains = exports.combineFilters = exports.unionFilterSegment = exports.addFilterSegment = void 0;
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
    var filter = {};
    filters.forEach(function (ele) {
        var _a, _b, _c, _d;
        if (ele) {
            for (var k in ele) {
                if (k === '$and') {
                    if (filter.$and) {
                        (_a = filter.$and).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(ele[k]), false));
                    }
                    else {
                        filter.$and = ele[k];
                    }
                }
                else if (k === '$or') {
                    if (filter.$or) {
                        (_b = filter.$or).push.apply(_b, tslib_1.__spreadArray([], tslib_1.__read(ele[k]), false));
                    }
                    else {
                        filter.$or = ele[k];
                    }
                }
                else if (filter.hasOwnProperty(k)) {
                    if (filter.$and) {
                        filter.$and.push((_c = {},
                            _c[k] = ele[k],
                            _c));
                    }
                    else {
                        filter.$and = [
                            (_d = {},
                                _d[k] = ele[k],
                                _d)
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
 * 判断value1表达的单个属性查询与同属性上value2表达的查询是相容还是相斥
 * 相容即value2所表达的查询结果一定符合value1表达的查询结果，例如：
 * value1: {
 *  $gt: 8,
 * }
 * value2: {
 *  $eq: 12
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
 * @param value1
 * @param value2
 */
function judgeFilterValueRelation(value1, value2, contained) {
    if (typeof value1 === 'object') {
        var attr = Object.keys(value1)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne',
            '$startsWith', '$endsWith', '$includes'].includes(attr)) {
            switch (attr) {
                case '$gt': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$gt' && value2[attr2] >= value1.$gt
                            || ['$gte', '$eq'].includes(attr2) && value2[attr2] > value1.$gt
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gt || ele <= value1.$gt; }));
                    }
                    else {
                        return value2 > value1.$gt;
                    }
                }
                case '$gte': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$gt' && value2[attr2] > value1.$gte
                            || ['$gte', '$eq'].includes(attr2) && value2[attr2] >= value1.$gte
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$gte || ele < value1.$gte; }));
                    }
                    else {
                        return value2 >= value1.$gt;
                    }
                }
                case '$lt': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$lt' && value2[attr2] <= value1.$lt
                            || ['$lte', '$eq'].includes(attr2) && value2[attr2] < value1.$lt
                            || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find(function (ele) { return typeof ele !== typeof value1.$lt || ele >= value1.$lt; });
                    }
                    else {
                        return value2 < value1.$lt;
                    }
                }
                case '$lte': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$lt' && value2[attr2] < value1.$lte
                            || ['$lte', '$eq'].includes(attr2) && value2[attr2] <= value1.$lte
                            || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2].find(function (ele) { return typeof ele !== typeof value1.$lte || ele > value1.$lte; }));
                    }
                    else {
                        return value2 <= value1.$lte;
                    }
                }
                case '$eq': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && value2[attr2] === value1.$eq;
                    }
                    else {
                        return value2 === value1.$eq;
                    }
                }
                case '$ne': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && value2[attr2] !== value1.$ne
                            || attr2 === '$ne' && value2[attr2] === value1.$ne
                            || attr2 === '$gt' && value2[attr2] >= value1.$ne
                            || attr2 === '$gte' && value2[attr2] > value1.$ne
                            || attr2 === '$lt' && value2[attr2] <= value1.$ne
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(function (ele) { return ele === value1.$ne; }))
                            || attr2 === '$nin' && value2[attr2] instanceof Array && !!(value2[attr2]).find(function (ele) { return ele === value1.$ne; });
                    }
                    else {
                        return value2 !== value1.$ne;
                    }
                }
                case '$startsWith': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                            && value2[attr2].startsWith(value1.$startsWith)
                            || attr2 === '$in' && value2[attr2] instanceof Array
                                && !value2[attr2].find(function (ele) { return typeof ele !== 'string' || !ele.startsWith(value1.$startsWith); });
                    }
                    else {
                        return typeof value2 === 'string' && value2.startsWith(value1.$startsWith);
                    }
                }
                case '$endsWith': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                            && value2[attr2].endsWith(value1.$endsWith)
                            || attr2 === '$in' && value2[attr2] instanceof Array
                                && !value2[attr2].find(function (ele) { return typeof ele !== 'string' || !ele.endsWith(value1.$endsWith); });
                    }
                    else {
                        return typeof value2 === 'string' && value2.endsWith(value1.$endsWith);
                    }
                }
                case '$includes': {
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return ['$includes', '$startsWith', '$endsWith'].includes(attr2)
                            && typeof (value2[attr2]) === 'string'
                            && value2[attr2].includes(value1.$includes)
                            || attr2 === '$in' && value2[attr2] instanceof Array
                                && !value2[attr2].find(function (ele) { return typeof ele !== 'string' || !ele.includes(value1.$includes); });
                    }
                    else {
                        return typeof value2 === 'string' && value2.includes(value1.$includes);
                    }
                }
                default: {
                    (0, assert_1.default)(false, "\u4E0D\u80FD\u5904\u7406\u7684\u7B97\u5B50\u300C".concat(attr, "\u300D"));
                }
            }
        }
        else if (['$exists'].includes(attr)) {
            (0, assert_1.default)(attr === '$exists');
            if (typeof value2 === 'object') {
                var attr2 = Object.keys(value2)[0];
                if (value1.$exists === false) {
                    return attr2 === '$exists' && value2[attr2] === false;
                }
                else {
                    // 可能不完整，有没有更多情况？
                    return !(attr2 === '$exists' && value2[attr2] === false
                        || attr2 === '$nin');
                }
            }
            else {
                return value1.$exists === true;
            }
        }
        else if (['$in', '$nin', '$between'].includes(attr)) {
            switch (attr) {
                case '$in': {
                    if (value1.$in instanceof Array) {
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return attr2 === '$in' && value2[attr2] instanceof Array
                                && (0, lodash_1.difference)(value2[attr2], value1.$in).length === 0;
                        }
                        else {
                            return value1.$in.includes(value2);
                        }
                    }
                    else {
                        // 子查询，暂不支持
                        return false;
                    }
                }
                case '$nin': {
                    if (value1.$nin instanceof Array) {
                        if (typeof value2 === 'object') {
                            var attr2 = Object.keys(value2)[0];
                            return attr2 === '$in' && value2[attr2] instanceof Array
                                && (0, lodash_1.intersection)(value2[attr2], value1.$nin).length === 0
                                || attr2 === '$nin' && value2[attr2] instanceof Array
                                    && (0, lodash_1.difference)(value1.$nin, value2[attr2]).length === 0;
                        }
                        else {
                            return !value1.$nin.includes(value2);
                        }
                    }
                    else {
                        // 子查询，暂不支持
                        return false;
                    }
                }
                case '$between': {
                    (0, assert_1.default)(value1.$between instanceof Array);
                    if (typeof value2 === 'object') {
                        var attr2 = Object.keys(value2)[0];
                        return attr2 === '$in' && value2[attr2] instanceof Array
                            && Math.max.apply(Math, tslib_1.__spreadArray([], tslib_1.__read(value2[attr2]), false)) <= value1.$between[1] && Math.min.apply(Math, tslib_1.__spreadArray([], tslib_1.__read(value2[attr2]), false)) >= value1.$between[0]
                            || attr2 === '$eq' && typeof value2[attr2] === 'number'
                                && value2[attr2] <= value1.$between[1] && value2[attr2] >= value1.$between[0];
                    }
                    else {
                        return value2 <= value1.$between[1] && value2 >= value1.$between[0];
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
        if (typeof value2 === 'object') {
            return false;
        }
        else {
            return value1 === value2;
        }
    }
}
function compareFilter2AttributeValue(entity, schema, attr, filter, conditionalFilterAttrValue, contained) {
    var _a;
    for (var attr2 in filter) {
        if (['$and', '$or'].includes(attr2)) {
            switch (attr2) {
                case '$and':
                case '$or':
                case '$xor': {
                    var logicQueries = filter[attr2];
                    var results = logicQueries.map(function (logicQuery) { return compareFilter2AttributeValue(entity, schema, attr, logicQuery, conditionalFilterAttrValue, contained); });
                    if (attr2 === '$and' && contained || attr2 === '$or' && !contained) {
                        // 如果filter的多个算子是and关系，则只要有一个包含此条件就行
                        // 如果filter的多个算子是or关系，则只要有一个相斥只条件就行
                        if (results.includes(true)) {
                            return true;
                        }
                    }
                    else if (attr2 === '$or' && contained || attr2 === '$and' && !contained) {
                        // 如果filter的多个算子是or关系，则必须每个都能包含此条件
                        // 如果filter的多个算子是and关系，则必须每个都与此条件相斥
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
                    /* 判断相容，如果filter的中有not，此not条件应当和conditionalFilterAttrValue的条件相斥
                    * 如： conditionalFilter 为 { a: { $ne: 3 } }
                    *       filter 为 { $not: { a: 3 }}
                    * 判断相斥，如果filter中有not，此not条件应当被conditionalFilterAttrValue的条件相容
                    * 如： conditionalFilter为 { a: 2 }
                    *       filter 为 { $not: { a: { $gt: 1 }}}
                    *
                    * todo 再想一想对吗？
                    */
                    var logicQuery = filter[attr2];
                    if (contained && !compareFilter2AttributeValue(entity, schema, attr2, logicQuery, conditionalFilterAttrValue, !contained)) {
                        return false;
                    }
                    if (!contained && judgeFilterRelation(entity, schema, (_a = {}, _a[attr2] = conditionalFilterAttrValue, _a), logicQuery, contained)) {
                        return true;
                    }
                    break;
                }
                default: {
                    break;
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
                    return judgeFilterValueRelation(filter[attr2], conditionalFilterAttrValue, contained);
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
    return contained;
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
                        // 如果是包容关系，则无论and还是or，conditionalFilter中的任何一个查询条件都应当被filter所包容
                        if (results.includes(false)) {
                            return false;
                        }
                    }
                    else if (!contained) {
                        // 如果是相斥关系，则无论and还是or，conditionalFilter中的任何一个查询条件都应当与filter所相斥
                        if (!results.includes(true)) {
                            return false;
                        }
                    }
                    else {
                        (0, assert_1.default)(false);
                    }
                    break;
                }
                case '$not': {
                    var logicQuery = conditionalFilter[attr];
                    if (!judgeFilterRelation(entity, schema, filter, logicQuery, !contained)) {
                        return false;
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
            if (contained && !compareFilter2AttributeValue(entity, schema, attr, filter, conditionalFilter[attr], contained)) {
                // 相容关系只要有一个不相容就不相容
                return false;
            }
            if (!contained && !compareFilter2AttributeValue(entity, schema, attr, filter, conditionalFilter[attr], contained)) {
                // 相斥关系只要有一个相斥就相斥
                return true;
            }
        }
    }
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
    return false;
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
    return false;
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
function checkFilterContains(entity, context, contained, filter) {
    if (!filter) {
        throw new types_1.OakRowInconsistencyException();
    }
    var schema = context.getSchema();
    // 优先判断两个条件是否相容
    if (contains(entity, schema, filter, contained)) {
        return true;
    }
    // 再判断加上了conditionalFilter后取得的行数是否缩减
    var filter2 = combineFilters([filter, {
            $not: contained,
        }]);
    var count = context.count(entity, {
        filter: filter2,
    }, {
        dontCollect: true,
        blockTrigger: true,
    });
    if (count instanceof Promise) {
        return count.then(function (count2) { return count2 === 0; });
    }
    return count === 0;
}
exports.checkFilterContains = checkFilterContains;
