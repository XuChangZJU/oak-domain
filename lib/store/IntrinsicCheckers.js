"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIntrinsicCheckers = void 0;
const types_1 = require("../types");
const lodash_1 = require("../utils/lodash");
const filter_1 = require("./filter");
const modi_1 = require("./modi");
const checker_1 = require("./checker");
const action_1 = require("../actions/action");
function checkUniqueBetweenRows(rows, uniqAttrs) {
    // 先检查这些行本身之间有无unique冲突
    const dict = {};
    for (const row of rows) {
        let s = '';
        for (const a of uniqAttrs) {
            if (row[a] === null || row[a] === undefined) {
                s + row.id;
            }
            else {
                s + `-${row[a]}`;
            }
        }
        if (dict[s]) {
            throw new types_1.OakUniqueViolationException([{
                    id: row.id,
                    attrs: uniqAttrs,
                }]);
        }
        else {
            dict[s] = 1;
        }
    }
}
function checkCountLessThan(count, uniqAttrs, than = 0, id) {
    if (count instanceof Promise) {
        return count.then((count2) => {
            if (count2 > than) {
                throw new types_1.OakUniqueViolationException([{
                        id,
                        attrs: uniqAttrs,
                    }]);
            }
        });
    }
    if (count > than) {
        throw new types_1.OakUniqueViolationException([{
                id,
                attrs: uniqAttrs,
            }]);
    }
}
function checkUnique(entity, row, context, uniqAttrs, extraFilter) {
    const filter = (0, lodash_1.pick)(row, uniqAttrs);
    for (const a in filter) {
        if (filter[a] === null || filter[a] === undefined) {
            delete filter[a];
        }
    }
    if (Object.keys(filter).length < uniqAttrs.length) {
        // 说明有null值，不需要检查约束
        return;
    }
    const filter2 = extraFilter ? (0, filter_1.combineFilters)(entity, context.getSchema(), [filter, extraFilter]) : filter;
    const count = context.count(entity, { filter: filter2 }, { dontCollect: true });
    return checkCountLessThan(count, uniqAttrs, 0, row.id);
}
function createUniqueCheckers(schema) {
    const checkers = [];
    for (const entity in schema) {
        const { indexes } = schema[entity];
        if (indexes) {
            for (const index of indexes) {
                if (index.config?.unique) {
                    const { attributes } = index;
                    const uniqAttrs = attributes.map(ele => ele.name);
                    checkers.push({
                        entity,
                        action: 'create',
                        type: 'logicalData',
                        priority: types_1.CHECKER_MAX_PRIORITY, // 优先级要放在最低，所有前置的checker/trigger将数据完整之后再在这里检测
                        checker: (operation, context) => {
                            const { data } = operation;
                            if (data instanceof Array) {
                                checkUniqueBetweenRows(data, uniqAttrs);
                                const checkResult = data.map(ele => checkUnique(entity, ele, context, uniqAttrs));
                                if (checkResult[0] instanceof Promise) {
                                    return Promise.all(checkResult).then(() => undefined);
                                }
                            }
                            else if (data) {
                                return checkUnique(entity, data, context, uniqAttrs);
                            }
                        }
                    }, {
                        entity,
                        action: 'update', // 只检查update，其它状态转换的action应该不会涉及unique约束的属性
                        type: 'logicalData',
                        priority: types_1.CHECKER_MAX_PRIORITY, // 优先级要放在最低，所有前置的checker/trigger将数据完整之后再在这里检测
                        checker: (operation, context) => {
                            const { data, filter: operationFilter } = operation;
                            if (data) {
                                const attrs = Object.keys(data);
                                const refAttrs = (0, lodash_1.intersection)(attrs, uniqAttrs);
                                if (refAttrs.length === 0) {
                                    // 如果本次更新和unique约束的属性之间没有交集则直接返回
                                    return;
                                }
                                for (const attr of refAttrs) {
                                    // 如果有更新为null值，不用再检查约束
                                    if (data[attr] === null || data[attr] === undefined) {
                                        return;
                                    }
                                }
                                if (refAttrs.length === uniqAttrs.length) {
                                    // 如果更新了全部属性，直接检查
                                    const filter = (0, lodash_1.pick)(data, refAttrs);
                                    // 在这些行以外的行不和更新后的键值冲突
                                    const count = context.count(entity, {
                                        filter: (0, filter_1.combineFilters)(entity, context.getSchema(), [filter, {
                                                $not: operationFilter,
                                            }]),
                                    }, { dontCollect: true });
                                    const checkCount = checkCountLessThan(count, uniqAttrs, 0, operationFilter?.id);
                                    // 更新的行只能有一行
                                    const rowCount = context.count(entity, {
                                        filter: operationFilter,
                                    }, { dontCollect: true });
                                    const checkRowCount = checkCountLessThan(rowCount, uniqAttrs, 1, operationFilter?.id);
                                    // 如果更新的行数为零似乎也可以，但这应该不可能出现吧，by Xc 20230131
                                    if (checkRowCount instanceof Promise) {
                                        return Promise.all([checkCount, checkRowCount]).then(() => undefined);
                                    }
                                }
                                // 否则需要结合本行现有的属性来进行检查
                                const projection = { id: 1 };
                                for (const attr of uniqAttrs) {
                                    Object.assign(projection, {
                                        [attr]: 1,
                                    });
                                }
                                const checkWithRows = (rows2) => {
                                    const rows22 = rows2.map(ele => Object.assign(ele, data));
                                    // 先检查这些行本身之间是否冲突
                                    checkUniqueBetweenRows(rows22, uniqAttrs);
                                    const checkResults = rows22.map((row) => checkUnique(entity, row, context, uniqAttrs, {
                                        $not: operationFilter
                                    }));
                                    if (checkResults[0] instanceof Promise) {
                                        return Promise.all(checkResults).then(() => undefined);
                                    }
                                };
                                const currentRows = context.select(entity, {
                                    data: projection,
                                    filter: operationFilter,
                                }, { dontCollect: true });
                                if (currentRows instanceof Promise) {
                                    return currentRows.then((row2) => checkWithRows(row2));
                                }
                                return checkWithRows(currentRows);
                            }
                        }
                    });
                }
            }
        }
    }
    return checkers;
}
function createActionTransformerCheckers(actionDefDict) {
    const checkers = [];
    for (const entity in actionDefDict) {
        for (const attr in actionDefDict[entity]) {
            const def = actionDefDict[entity][attr];
            const { stm, is } = def;
            for (const action in stm) {
                const actionStm = stm[action];
                const conditionalFilter = typeof actionStm[0] === 'string' ? {
                    [attr]: actionStm[0],
                } : {
                    [attr]: {
                        $in: actionStm[0],
                    },
                };
                checkers.push({
                    action: action,
                    type: 'row',
                    entity,
                    filter: conditionalFilter,
                    errMsg: '',
                });
                // 这里用data类型的checker改数据了不太好，先这样
                checkers.push({
                    action: action,
                    type: 'data',
                    entity,
                    checker: (data) => {
                        Object.assign(data, {
                            [attr]: stm[action][1],
                        });
                    }
                });
            }
            if (is) {
                checkers.push({
                    action: 'create',
                    type: 'data',
                    entity,
                    priority: 10, // 优先级要高，先于真正的data检查进行
                    checker: (data) => {
                        if (data instanceof Array) {
                            data.forEach(ele => {
                                if (!ele[attr]) {
                                    Object.assign(ele, {
                                        [attr]: is,
                                    });
                                }
                            });
                        }
                        else {
                            if (!data[attr]) {
                                Object.assign(data, {
                                    [attr]: is,
                                });
                            }
                        }
                    }
                });
            }
        }
    }
    return checkers;
}
function createAttrUpdateCheckers(schema, attrUpdateMatrix) {
    const checkers = [];
    for (const entity in attrUpdateMatrix) {
        const matrix = attrUpdateMatrix[entity];
        const updateAttrs = Object.keys(matrix);
        const { actions } = schema[entity];
        const updateActions = actions.filter((a) => !action_1.readOnlyActions.concat(['create', 'remove']).includes(a));
        /**
         * 如果一个entity定义了attrUpdateMatrix，则必须严格遵循定义，未出现在matrix中的属性不允许更新
         */
        const updateChecker = {
            entity,
            action: updateActions,
            type: 'logicalData',
            checker({ data, filter }, context) {
                const attrs = Object.keys(data);
                const extras = (0, lodash_1.difference)(attrs, updateAttrs);
                if (extras.length > 0) {
                    throw new types_1.OakAttrCantUpdateException(entity, extras, '更新了不允许的属性');
                }
                const filters = attrs.map(ele => matrix[ele]);
                const conditionalFilter = (0, filter_1.combineFilters)(entity, schema, filters);
                const result = (0, filter_1.checkFilterContains)(entity, context, conditionalFilter, filter, true);
                if (result instanceof Promise) {
                    return result.then((v) => {
                        if (!v) {
                            throw new types_1.OakAttrCantUpdateException(entity, attrs, '更新的行当前属性不满足约束，请仔细检查数据');
                        }
                    });
                }
                if (!result) {
                    throw new types_1.OakAttrCantUpdateException(entity, attrs, '更新的行当前属性不满足约束，请仔细检查数据');
                }
            }
        };
        checkers.push(updateChecker);
    }
    return checkers;
}
function makeIntrinsicCheckers(schema, actionDefDict, attrUpdateMatrix) {
    const checkers = [];
    checkers.push(...(0, modi_1.createModiRelatedCheckers)(schema));
    checkers.push(...(0, checker_1.createRemoveCheckers)(schema));
    checkers.push(...(0, checker_1.createCreateCheckers)(schema));
    // action状态转换矩阵相应的checker
    checkers.push(...createActionTransformerCheckers(actionDefDict));
    // unique索引相应的checker
    checkers.push(...createUniqueCheckers(schema));
    if (attrUpdateMatrix) {
        // attrUpdateMatrix相应的checker
        checkers.push(...createAttrUpdateCheckers(schema, attrUpdateMatrix));
    }
    return checkers;
}
exports.makeIntrinsicCheckers = makeIntrinsicCheckers;
