"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerExecutor = void 0;
const assert_1 = __importDefault(require("assert"));
const lodash_1 = require("lodash");
const filter_1 = require("../store/filter");
const Trigger_1 = require("../types/Trigger");
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
const UnifiedActionMatrix = {
    'create': 'create',
    'remove': 'remove',
    'select': 'select',
    'download': 'select',
    'count': 'select',
    'stat': 'select',
};
class TriggerExecutor extends Trigger_1.Executor {
    triggerMap;
    triggerNameMap;
    volatileEntities;
    logger;
    constructor(logger = console) {
        super();
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
    }
    registerChecker(checker) {
        const { entity, action, checker: checkFn } = checker;
        const ActionNameMatrix = {
            'create': '创建',
            'remove': '删除',
        };
        let triggerAction = ActionNameMatrix[action] || '更新';
        const triggerName = `${entity}${triggerAction}权限检查`;
        const trigger = {
            name: triggerName,
            entity,
            action,
            fn: checkFn,
            when: 'before',
        };
        this.registerTrigger(trigger);
    }
    registerTrigger(trigger) {
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error(`不可有同名的触发器「${trigger.name}」`);
        }
        (0, lodash_1.assign)(this.triggerNameMap, {
            [trigger.name]: trigger,
        });
        const action = UnifiedActionMatrix[trigger.action] || 'update';
        const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity][action];
        if (triggers) {
            triggers.push(trigger);
        }
        else if (this.triggerMap[trigger.entity]) {
            (0, lodash_1.assign)(this.triggerMap[trigger.entity], {
                [action]: [trigger],
            });
        }
        else {
            (0, lodash_1.assign)(this.triggerMap, {
                [trigger.entity]: {
                    [action]: [trigger],
                }
            });
        }
        if (trigger.when === 'commit' && trigger.strict === 'makeSure') {
            if (this.volatileEntities.indexOf(trigger.entity) === -1) {
                this.volatileEntities.push(trigger.entity);
            }
        }
    }
    unregisterTrigger(trigger) {
        (0, assert_1.default)(trigger.when !== 'commit' || trigger.strict !== 'makeSure');
        const action = UnifiedActionMatrix[trigger.action] || 'update';
        const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity][action];
        if (triggers) {
            (0, lodash_1.pull)(triggers, trigger);
            (0, lodash_1.unset)(this.triggerNameMap, trigger.name);
        }
    }
    async preCommitTrigger(entity, operation, trigger, context) {
        (0, assert_1.default)(trigger.action !== 'select');
        if (trigger.strict === 'makeSure') {
            switch (operation.action) {
                case 'create': {
                    if (operation.data.hasOwnProperty(Trigger_1.Executor.dataAttr) || operation.data.hasOwnProperty(Trigger_1.Executor.timestampAttr)) {
                        throw new Error('同一行数据上不能存在两个跨事务约束');
                    }
                    break;
                }
                default: {
                    const { filter } = operation;
                    // 此时要保证更新或者删除的行上没有跨事务约束
                    const filter2 = (0, filter_1.addFilterSegment)({
                        $or: [
                            {
                                $$triggerData$$: {
                                    $exists: true,
                                },
                            },
                            {
                                $$triggerTimestamp$$: {
                                    $exists: true,
                                },
                            }
                        ],
                    }, filter);
                    const { rowStore } = context;
                    const count = await rowStore.count(entity, {
                        filter: filter2
                    }, context);
                    if (count > 0) {
                        throw new Error(`对象${entity}的行「${JSON.stringify(operation)}」上已经存在未完成的跨事务约束`);
                    }
                    break;
                }
            }
            (0, lodash_1.assign)(operation.data, {
                [Trigger_1.Executor.dataAttr]: {
                    name: trigger.name,
                    operation,
                },
                [Trigger_1.Executor.timestampAttr]: Date.now(),
            });
        }
    }
    async preOperation(entity, operation, context) {
        const action = UnifiedActionMatrix[operation.action] || 'update';
        const triggers = this.triggerMap[entity] && this.triggerMap[entity][action];
        if (triggers) {
            const preTriggers = triggers.filter(ele => ele.when === 'before' && (!ele.check || ele.check(operation)));
            for (const trigger of preTriggers) {
                const number = await trigger.fn({ operation: operation }, context);
                if (number > 0) {
                    this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                }
            }
            const commitTriggers = triggers.filter(ele => ele.when === 'commit' && (!ele.check || ele.check(operation)));
            for (const trigger of commitTriggers) {
                await this.preCommitTrigger(entity, operation, trigger, context);
            }
        }
    }
    onCommit(trigger, operation) {
        return async (context) => {
            await context.begin();
            const number = await trigger.fn({
                operation: operation,
            }, context);
            const { rowStore } = context;
            if (trigger.strict === 'makeSure') {
                // 如果是必须完成的trigger，在完成成功后要把trigger相关的属性置null;
                let filter = {};
                if (operation.action === 'create') {
                    filter = operation.data instanceof Array ? {
                        filter: {
                            id: {
                                $in: operation.data.map(ele => ele.id),
                            },
                        },
                    } : {
                        filter: {
                            id: operation.data.id,
                        }
                    };
                }
                else if (operation.filter) {
                    (0, lodash_1.assign)(filter, { filter: operation.filter });
                }
                await rowStore.operate(trigger.entity, {
                    action: 'update',
                    data: {
                        $$triggerTimestamp$$: null,
                        $$triggerData$$: null,
                    },
                    ...filter /** as Filter<'update', DeduceFilter<ED[T]['Schema']>> */,
                }, context);
            }
            await context.commit();
            return;
        };
    }
    async postCommitTrigger(operation, trigger, context) {
        context.on('commit', this.onCommit(trigger, operation));
    }
    async postOperation(entity, operation, context) {
        const action = UnifiedActionMatrix[operation.action] || 'update';
        const triggers = this.triggerMap[entity] && this.triggerMap[entity][action];
        if (triggers) {
            const postTriggers = triggers.filter(ele => ele.when === 'after' && (!ele.check || ele.check(operation)));
            for (const trigger of postTriggers) {
                const number = await trigger.fn({ operation: operation }, context);
                if (number > 0) {
                    this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                }
            }
            const commitTriggers = triggers.filter(ele => ele.when === 'commit' && (!ele.check || ele.check(operation)));
            for (const trigger of commitTriggers) {
                await this.postCommitTrigger(operation, trigger, context);
            }
        }
    }
    async checkpoint(context, timestamp) {
        let result = 0;
        const { rowStore } = context;
        for (const entity of this.volatileEntities) {
            const { result: rows } = await rowStore.select(entity, {
                data: {
                    id: 1,
                    $$triggerData$$: 1,
                },
                filter: {
                    $$triggerTimestamp$$: {
                        $gt: timestamp,
                    }
                },
            }, context);
            for (const row of rows) {
                const { $$triggerData$$ } = row;
                const { name, operation } = $$triggerData$$;
                const trigger = this.triggerNameMap[name];
                await this.onCommit(trigger, operation)(context);
            }
        }
        return result;
    }
}
exports.TriggerExecutor = TriggerExecutor;
