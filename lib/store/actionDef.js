"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeActionDefDict = void 0;
const lodash_1 = require("lodash");
const filter_1 = require("./filter");
const types_1 = require("../types");
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
                        // 优先判断两个条件是否相容
                        if (filter && (0, filter_1.contains)(entity, schema, filter, conditionalFilter)) {
                            return 0;
                        }
                        // 再判断加上了conditionalFilter后取得的行数是否缩减
                        const { rowStore } = context;
                        const filter2 = (0, filter_1.combineFilters)([filter, {
                                $not: conditionalFilter,
                            }]);
                        const { result } = await rowStore.select(entity, {
                            data: {
                                id: 1,
                            },
                            filter: filter2,
                            indexFrom: 0,
                            count: 1,
                        }, context);
                        if (result.length > 0) {
                            throw new types_1.OakRowInconsistencyException();
                        }
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
                        (0, lodash_1.assign)(operation, {
                            data: (0, lodash_1.assign)(data, {
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
                        (0, lodash_1.assign)(data, {
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
    };
}
exports.analyzeActionDefDict = analyzeActionDefDict;
