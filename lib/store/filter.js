"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repel = exports.contains = exports.combineFilters = exports.addFilterSegment = void 0;
function addFilterSegment(...filters) {
    const filter = {};
    filters.forEach(ele => {
        if (ele) {
            for (const k in ele) {
                if (k === '$and') {
                    if (filter.$and) {
                        filter.$and.push(...ele[k]);
                    }
                    else {
                        filter.$and = ele[k];
                    }
                }
                else if (k === '$or') {
                    if (filter.$or) {
                        filter.$or.push(...ele[k]);
                    }
                    else {
                        filter.$or = ele[k];
                    }
                }
                else if (filter.hasOwnProperty(k)) {
                    if (filter.$and) {
                        filter.$and.push({
                            [k]: ele[k],
                        });
                    }
                    else {
                        filter.$and = [
                            {
                                [k]: ele[k],
                            }
                        ];
                    }
                }
            }
        }
    });
    return filter;
}
exports.addFilterSegment = addFilterSegment;
function combineFilters(filters) {
    return addFilterSegment(...filters);
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
