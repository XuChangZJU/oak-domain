"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeActionDefDict = exports.checkFilterContains = exports.getFullProjection = void 0;
const filter_1 = require("./filter");
const types_1 = require("../types");
function getFullProjection(entity, schema) {
    const { attributes } = schema[entity];
    const projection = {
        id: 1,
        $$createAt$$: 1,
        $$updateAt$$: 1,
        $$deleteAt$$: 1,
    };
    Object.keys(attributes).forEach((k) => Object.assign(projection, {
        [k]: 1,
    }));
    return projection;
}
exports.getFullProjection = getFullProjection;
async function checkFilterContains(entity, schema, contained, context, filter) {
    if (!filter) {
        throw new types_1.OakRowInconsistencyException();
    }
    // 优先判断两个条件是否相容
    if ((0, filter_1.contains)(entity, schema, filter, contained)) {
        return;
    }
    // 再判断加上了conditionalFilter后取得的行数是否缩减
    const { rowStore } = context;
    const filter2 = (0, filter_1.combineFilters)([filter, {
            $not: contained,
        }]);
    const { result } = await rowStore.select(entity, {
        data: getFullProjection(entity, schema),
        filter: filter2,
        indexFrom: 0,
        count: 10,
    }, context);
    if (result.length > 0) {
        const data = {};
        result.forEach(ele => Object.assign(data, {
            [ele.id]: ele,
        }));
        throw new types_1.OakRowInconsistencyException({
            a: 's',
            d: {
                [entity]: data,
            }
        });
    }
}
exports.checkFilterContains = checkFilterContains;
function makeIntrinsicWatchers(schema) {
    const watchers = [];
    for (const entity in schema) {
        const { attributes } = schema[entity];
        const now = Date.now();
        const { expiresAt, expired } = attributes;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity,
                name: `对象${entity}上的过期自动watcher`,
                filter: async () => {
                    return {
                        expired: false,
                        expiresAt: {
                            $lte: now,
                        },
                    };
                },
                action: 'update',
                actionData: {
                    expired: true,
                },
            });
        }
    }
    return watchers;
}
function analyzeActionDefDict(schema, actionDefDict) {
    const checkers = [];
    const triggers = [];
    for (const entity in actionDefDict) {
        for (const attr in actionDefDict[entity]) {
            const def = actionDefDict[entity][attr];
            const { stm, is } = def;
            for (const action in stm) {
                const actionStm = stm[action];
                checkers.push({
                    action: action,
                    type: 'row',
                    entity,
                    checker: async ({ operation }, context) => {
                        const { filter } = operation;
                        const conditionalFilter = typeof actionStm[0] === 'string' ? {
                            [attr]: actionStm[0],
                        } : {
                            [attr]: {
                                $in: actionStm[0],
                            },
                        };
                        await checkFilterContains(entity, schema, conditionalFilter, context, filter);
                        return 0;
                    }
                });
                triggers.push({
                    name: `set next state of ${attr} for ${entity} on action ${action}`,
                    action: action,
                    entity,
                    when: 'before',
                    fn: async ({ operation }) => {
                        const { data = {} } = operation;
                        Object.assign(operation, {
                            data: Object.assign(data, {
                                [attr]: stm[action][1],
                            }),
                        });
                        return 1;
                    }
                });
            }
            if (is) {
                triggers.push({
                    name: `set initial state of ${attr} for ${entity} on create`,
                    action: 'create',
                    entity,
                    when: 'before',
                    fn: async ({ operation }) => {
                        const { data } = operation;
                        Object.assign(data, {
                            [attr]: is,
                        });
                        return 1;
                    }
                });
            }
        }
    }
    return {
        triggers,
        checkers,
        watchers: makeIntrinsicWatchers(schema),
    };
}
exports.analyzeActionDefDict = analyzeActionDefDict;
