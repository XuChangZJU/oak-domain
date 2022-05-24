"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repel = exports.contains = exports.combineFilters = exports.addFilterSegment = void 0;
const lodash_1 = require("lodash");
function addFilterSegment(segment2, filter2) {
    const filter = filter2 ? (0, lodash_1.cloneDeep)(filter2) : {};
    const segment = segment2 ? (0, lodash_1.cloneDeep)(segment2) : {};
    if ((0, lodash_1.intersection)((0, lodash_1.keys)(filter), (0, lodash_1.keys)(segment)).length > 0) {
        if (filter.hasOwnProperty('$and')) {
            filter.$and.push(segment);
        }
        else {
            (0, lodash_1.assign)(filter, {
                $and: [segment],
            });
        }
    }
    else {
        (0, lodash_1.assign)(filter, segment);
    }
    return filter;
}
exports.addFilterSegment = addFilterSegment;
function combineFilters(filters) {
    return filters.reduce(addFilterSegment);
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
