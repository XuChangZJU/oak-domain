import { assign } from "lodash";
import { combineFilters, contains } from "./filter";
import { ActionDictOfEntityDict, Checker, Context, CreateTriggerInTxn, EntityDict, OakRowInconsistencyException, StorageSchema, Trigger, UpdateChecker, UpdateTriggerInTxn } from "../types";

export function analyzeActionDefDict<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>, actionDefDict: ActionDictOfEntityDict<ED>) {
    const checkers: Array<Checker<ED, keyof ED, Cxt>> = [];
    const triggers: Array<Trigger<ED, keyof ED, Cxt>> = [];
    for (const entity in actionDefDict) {
        for (const attr in actionDefDict[entity]) {
            const def = actionDefDict[entity]![attr];
            const { stm, is } = def!; 
            for (const action in stm) {
                const actionStm = stm[action]!;
                checkers.push({
                    action: action as any,
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
                        if (filter && contains(entity, schema, filter, conditionalFilter)) {
                            return 0;
                        }
                        // 再判断加上了conditionalFilter后取得的行数是否缩减
                        const { rowStore } = context;
                        const filter2 = combineFilters([filter, {
                            $not: conditionalFilter,
                        }]);
                        const { result } = await rowStore.select(entity, {
                            data: {
                                id: 1,
                            } as any,
                            filter: filter2,
                            indexFrom: 0,
                            count: 1,
                        }, context);
                        if (result.length > 0) {
                            throw new OakRowInconsistencyException();
                        }
                        return 0;
                    }
                } as UpdateChecker<ED, typeof entity, Cxt>);
                triggers.push({
                    name: `set next state of ${attr} for ${entity} on action ${action}`,
                    action: action as any,
                    entity,
                    when: 'before',
                    fn: async ({ operation }) => {
                        const { data = {} } = operation;
                        assign(operation, {
                            data: assign(data, {
                                [attr]: stm[action][1],
                            }),
                        });
                        return 1;
                    }
                } as UpdateTriggerInTxn<ED, any, Cxt>)
            }

            if (is) {
                triggers.push({                    
                    name: `set initial state of ${attr} for ${entity} on create`,
                    action: 'create',
                    entity,
                    when: 'before',
                    fn: async ({ operation }) => {
                        const { data } = operation;
                        assign(data, {
                            [attr]: is,
                        });
                        return 1;
                    }
                } as CreateTriggerInTxn<ED, any, Cxt>);
            }
        }
    }

    return {
        triggers,
        checkers,
    };
}