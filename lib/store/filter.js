"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repel = exports.contains = exports.combineFilters = exports.addFilterSegment = void 0;
var tslib_1 = require("tslib");
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
function combineFilters(filters) {
    return addFilterSegment.apply(void 0, tslib_1.__spreadArray([], tslib_1.__read(filters), false));
}
exports.combineFilters = combineFilters;
/**
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
 */
function contains(entity, schema, filter, conditionalFilter) {
    // todo
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
