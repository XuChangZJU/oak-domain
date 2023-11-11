"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModiRelatedTriggers = exports.createModiRelatedCheckers = exports.abandonModis = exports.applyModis = exports.createOperationsFromModies = void 0;
const tslib_1 = require("tslib");
const types_1 = require("../types");
const action_1 = require("../actions/action");
const lodash_1 = require("../utils/lodash");
const uuid_1 = require("../utils/uuid");
const assert_1 = tslib_1.__importDefault(require("assert"));
function createOperationsFromModies(modies) {
    return modies.map((modi) => {
        return {
            entity: modi.targetEntity,
            operation: {
                id: modi.id,
                action: modi.action,
                data: modi.data,
                filter: modi.filter,
            }
        };
    });
}
exports.createOperationsFromModies = createOperationsFromModies;
async function applyModis(filter, context, option) {
    return context.operate('modi', {
        id: await (0, uuid_1.generateNewIdAsync)(),
        action: 'apply',
        data: {},
        filter,
        /* sorter: [
            {
                $attr: {
                    $$createAt$$: 1,
                },
                $direction: 'asc',
            }
        ] */
    }, Object.assign({}, option, {
        blockTrigger: false,
    }));
}
exports.applyModis = applyModis;
async function abandonModis(filter, context, option) {
    return context.operate('modi', {
        id: await (0, uuid_1.generateNewIdAsync)(),
        action: 'abandon',
        data: {},
        filter,
        /* sorter: [
            {
                $attr: {
                    $$createAt$$: 1,
                },
                $direction: 'asc',
            }
        ] */
    }, Object.assign({}, option, {
        blockTrigger: false,
    }));
}
exports.abandonModis = abandonModis;
function createModiRelatedCheckers(schema) {
    const checkers = [];
    for (const entity in schema) {
        const { actionType, actions, inModi } = schema[entity];
        if (!inModi || ['readOnly', 'appendOnly'].includes(actionType)) {
            continue;
        }
        const restActions = (0, lodash_1.difference)(actions, action_1.appendOnlyActions);
        checkers.push({
            entity,
            action: restActions,
            type: 'row',
            filter: (operation, context, option) => {
                /**
                 * 只有一种情况可以通过，即当前是在更新和active的modi所指向同一个父更新对象。
                 * 比如：先申请了一个公司（company），再申请修改公司（companyApplyment），这时所有的active modi都指向此条companyApplyment
                 *      这时：
                 *          1）再申请一条新的修改公司（create companyApplyment），应被拒绝
                 *          2）申请修改原来的companyApplyment(update companyApplyment)，可以通过
                 *          3）在其它路径上对此company对象进行直接的更新，应被拒绝
                 */
                if (option.modiParentEntity) {
                    const { modiParentEntity, modiParentId } = option;
                    (0, assert_1.default)(modiParentEntity);
                    (0, assert_1.default)(modiParentId);
                    return {
                        modiEntity$entity: {
                            '#sqp': 'not in',
                            entity,
                            modi: {
                                iState: 'active',
                                $or: [
                                    {
                                        entity: {
                                            $ne: modiParentEntity,
                                        },
                                    },
                                    {
                                        entityId: {
                                            $ne: modiParentId,
                                        },
                                    }
                                ],
                            },
                        },
                        /* id: {
                            $nin: {
                                entity: 'modiEntity',
                                data: {
                                    entityId: 1,
                                },
                                filter: {
                                    entity,
                                    modi: {
                                        iState: 'active',
                                        $or: [
                                            {
                                                entity: {
                                                    $ne: modiParentEntity,
                                                },
                                            },
                                            {
                                                entityId: {
                                                    $ne: modiParentId,
                                                },
                                            }
                                        ],
                                    },
                                },
                            },
                        } */
                    };
                }
                return {
                    modiEntity$entity: {
                        '#sqp': 'not in',
                        entity,
                        modi: {
                            iState: 'active',
                        }
                    },
                    /* id: {
                        $nin: {
                            entity: 'modiEntity',
                            data: {
                                entityId: 1,
                            },
                            filter: {
                                entity,
                                modi: {
                                    iState: 'active',
                                }
                            },
                        },
                    } */
                };
            },
            errMsg: '您请求的更新对象上还有正在申请的更新，请等该更新结束后再试',
        });
    }
    return checkers;
}
exports.createModiRelatedCheckers = createModiRelatedCheckers;
function createModiRelatedTriggers(schema) {
    const triggers = [];
    for (const entity in schema) {
        const { toModi } = schema[entity];
        if (toModi) {
            // 当关联modi的对象被删除时，对应的modi也删除。这里似乎只需要删除掉活跃对象？因为oper不能删除，所以oper和modi是必须要支持对deleted对象的容错？
            // 这里没有想清楚，by Xc 20230209
            triggers.push({
                name: `当删除${entity}对象时，删除相关联的modi的modiEntity`,
                action: 'remove',
                entity,
                when: 'before',
                priority: types_1.TRIGGER_DEFAULT_PRIORITY,
                fn: async ({ operation }, context, option) => {
                    const { filter } = operation;
                    await context.operate('modiEntity', {
                        id: await (0, uuid_1.generateNewIdAsync)(),
                        action: 'remove',
                        data: {},
                        filter: {
                            modi: {
                                [entity]: filter,
                                iState: 'active',
                            },
                        }
                    }, { dontCollect: true });
                    await context.operate('modi', {
                        id: await (0, uuid_1.generateNewIdAsync)(),
                        action: 'remove',
                        data: {},
                        filter: {
                            [entity]: filter,
                            iState: 'active',
                        }
                    }, { dontCollect: true });
                    return 0;
                },
            });
        }
    }
    // modi被应用时的效用，搬到这里了
    const applyTrigger = {
        name: '当modi被应用时，将相应的operate完成',
        entity: 'modi',
        action: 'apply',
        when: 'after',
        fn: async ({ operation }, context, option) => {
            const { filter } = operation;
            const modies = await context.select('modi', {
                data: {
                    id: 1,
                    action: 1,
                    data: 1,
                    filter: 1,
                    targetEntity: 1,
                },
                filter,
                sorter: [
                    {
                        $attr: {
                            $$createAt$$: 1,
                        },
                        $direction: 'asc',
                    },
                ],
            }, option);
            for (const modi of modies) {
                const { targetEntity, id, action, data, filter } = modi;
                await context.operate(targetEntity, {
                    id: id,
                    action: action,
                    data: data,
                    filter: filter,
                }, {
                    ...option,
                    applyingModi: true,
                });
            }
            return modies.length;
        }
    };
    return triggers.concat([applyTrigger]);
}
exports.createModiRelatedTriggers = createModiRelatedTriggers;
