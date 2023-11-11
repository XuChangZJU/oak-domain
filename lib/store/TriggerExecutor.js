"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerExecutor = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const lodash_1 = require("../utils/lodash");
const filter_1 = require("../store/filter");
const Entity_1 = require("../types/Entity");
const Trigger_1 = require("../types/Trigger");
const SyncRowStore_1 = require("./SyncRowStore");
const checker_1 = require("./checker");
const projection_1 = require("../utils/projection");
const __1 = require("..");
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
/* const UnifiedActionMatrix: Record<string, string> = {
    'create': 'create',
    'remove': 'remove',
    'select': 'select',
    'download': 'select',
    'count': 'select',
    'stat': 'select',
}; */
class TriggerExecutor {
    counter;
    triggerMap;
    triggerNameMap;
    volatileEntities;
    logger;
    contextBuilder;
    constructor(contextBuilder, logger = console) {
        this.contextBuilder = contextBuilder;
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
        this.counter = 0;
    }
    registerChecker(checker) {
        const { entity, action, type, conditionalFilter, mt } = checker;
        const triggerName = `${String(entity)}${action}权限检查-${this.counter++}`;
        const { fn, when } = (0, checker_1.translateCheckerInAsyncContext)(checker);
        const trigger = {
            checkerType: type,
            name: triggerName,
            priority: checker.priority || Trigger_1.CHECKER_PRIORITY_MAP[type],
            entity,
            action: action,
            fn,
            when,
            mt,
            filter: conditionalFilter,
        };
        this.registerTrigger(trigger);
    }
    /*  getCheckers<T extends keyof ED>(entity: T, action: ED[T]['Action'], checkerTypes?: CheckerType[]) {
         const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
             trigger => (typeof trigger.action === 'string' && trigger.action === action || trigger.action instanceof Array && trigger.action.includes(action as any)
                 && (!checkerTypes || trigger.checkerType && checkerTypes.includes(trigger.checkerType)))
         );
         return triggers;
     } */
    registerTrigger(trigger) {
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error(`不可有同名的触发器「${trigger.name}」`);
        }
        if (typeof trigger.priority !== 'number') {
            trigger.priority = Trigger_1.TRIGGER_DEFAULT_PRIORITY; // 默认值
        }
        else {
            (0, assert_1.default)(trigger.priority <= Trigger_1.CHECKER_MAX_PRIORITY && trigger.priority >= Trigger_1.TRIGGER_MIN_PRIORITY, `trigger「${trigger.name}」的优先级定义越界，应该在${Trigger_1.TRIGGER_MIN_PRIORITY}到${Trigger_1.CHECKER_MAX_PRIORITY}之间`);
        }
        if (trigger.filter) {
            (0, assert_1.default)(typeof trigger.action === 'string' && trigger.action !== 'create'
                || trigger.action instanceof Array && !trigger.action.includes('create'), `trigger【${trigger.name}】是create类型但却带有filter`);
            (0, assert_1.default)(trigger.when === 'before' || trigger.when === 'commit', `定义了filter的trigger【${trigger.name}】的when只能是before或者commit`);
        }
        Object.assign(this.triggerNameMap, {
            [trigger.name]: trigger,
        });
        const addTrigger = (action) => {
            const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity][action];
            if (triggers) {
                let idx;
                // 这里可以保持有序插入，后面取trigger的时候就不用排序了
                for (idx = 0; idx < triggers.length; idx++) {
                    if (triggers[idx].priority > trigger.priority) {
                        break;
                    }
                }
                triggers.splice(idx, 0, trigger);
            }
            else if (this.triggerMap[trigger.entity]) {
                Object.assign(this.triggerMap[trigger.entity], {
                    [action]: [trigger],
                });
            }
            else {
                Object.assign(this.triggerMap, {
                    [trigger.entity]: {
                        [action]: [trigger],
                    }
                });
            }
        };
        if (typeof trigger.action === 'string') {
            addTrigger(trigger.action);
        }
        else {
            trigger.action.forEach(ele => addTrigger(ele));
        }
        if (trigger.when === 'commit' && trigger.strict === 'makeSure') {
            if (this.volatileEntities.indexOf(trigger.entity) === -1) {
                this.volatileEntities.push(trigger.entity);
            }
        }
    }
    unregisterTrigger(trigger) {
        (0, assert_1.default)(trigger.when !== 'commit' || trigger.strict !== 'makeSure', 'could not remove strict volatile triggers');
        const removeTrigger = (action) => {
            const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity][action];
            if (triggers) {
                (0, lodash_1.pull)(triggers, trigger);
                (0, lodash_1.unset)(this.triggerNameMap, trigger.name);
            }
        };
        if (typeof trigger.action === 'string') {
            removeTrigger(trigger.action);
        }
        else {
            trigger.action.forEach(ele => removeTrigger(ele));
        }
    }
    async preCommitTrigger(entity, operation, trigger, context, option) {
        (0, assert_1.default)(trigger.action !== 'select');
        (0, assert_1.default)(trigger.when === 'commit');
        const uuid = await (0, __1.generateNewIdAsync)();
        const cxtStr = context.toString();
        const { data } = operation;
        switch (operation.action) {
            case 'create': {
                if (data instanceof Array) {
                    data.forEach((d) => {
                        if (d.hasOwnProperty(Entity_1.TriggerDataAttribute) || d.hasOwnProperty(Entity_1.TriggerUuidAttribute)) {
                            throw new Error('同一行数据上不能同时存在两个跨事务约束');
                        }
                    });
                }
                else {
                    if (data.hasOwnProperty(Entity_1.TriggerDataAttribute) || data.hasOwnProperty(Entity_1.TriggerUuidAttribute)) {
                        throw new Error('同一行数据上不能存在两个跨事务约束');
                    }
                }
                break;
            }
            default: {
                const { filter } = operation;
                // 此时要保证更新或者删除的行上没有跨事务约束
                const filter2 = (0, filter_1.combineFilters)(entity, context.getSchema(), [{
                        [Entity_1.TriggerUuidAttribute]: {
                            $exists: true,
                        },
                    }, filter]);
                const count = await context.count(entity, {
                    filter: filter2
                }, {});
                if (count > 0) {
                    throw new Error(`对象${String(entity)}的行「${JSON.stringify(operation)}」上已经存在未完成的跨事务约束`);
                }
                break;
            }
        }
        if (data instanceof Array) {
            data.forEach((d) => {
                Object.assign(d, {
                    [Entity_1.TriggerDataAttribute]: {
                        name: trigger.name,
                        cxtStr: context.toString(),
                        params: option,
                    },
                    [Entity_1.TriggerUuidAttribute]: uuid,
                });
            });
        }
        else {
            Object.assign(data, {
                [Entity_1.TriggerDataAttribute]: {
                    name: trigger.name,
                    cxtStr,
                    params: option,
                },
                [Entity_1.TriggerUuidAttribute]: uuid,
            });
        }
        context.on('commit', async () => {
            const context2 = await this.contextBuilder(cxtStr);
            await context2.begin();
            try {
                const rows = await context2.select(entity, {
                    data: {
                        ...(0, projection_1.makeProjection)(entity, context.getSchema()),
                        [Entity_1.TriggerDataAttribute]: 1,
                        [Entity_1.TriggerUuidAttribute]: 1,
                    },
                    filter: {
                        [Entity_1.TriggerUuidAttribute]: uuid,
                    },
                }, {
                    includedDeleted: true,
                });
                if (rows.length > 0) {
                    await this.execVolatileTrigger(entity, trigger, context2, option, rows);
                }
                else {
                    // 如果是前台开发模式，debugStore不会保留删除行
                    (0, assert_1.default)(process.env.OAK_PLATFORM !== 'server' && operation.action === 'remove');
                }
                await context2.commit();
            }
            catch (err) {
                await context2.rollback();
                this.logger.error(err);
            }
        });
    }
    preOperation(entity, operation, context, option) {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity][action]?.filter(trigger => (typeof trigger.action === 'string' && trigger.action === operation.action
            || trigger.action instanceof Array && trigger.action.includes(operation.action))
            // 加上modi的过滤条件
            && this.judgeModiTurn(option, trigger));
        if (triggers) {
            const preTriggers = triggers.filter(ele => ele.when === 'before' && (!ele.check || ele.check(operation)));
            const commitTriggers = triggers.filter(ele => ele.when === 'commit' &&
                (!ele.check || ele.check(operation)));
            if (context instanceof SyncRowStore_1.SyncContext) {
                for (const trigger of preTriggers) {
                    if (trigger.filter) {
                        // trigger只对满足条件的前项进行判断，如果确定不满足可以pass
                        (0, assert_1.default)(operation.action !== 'create');
                        const { filter } = trigger;
                        const filterr = typeof filter === 'function' ? filter(operation, context, option) : filter;
                        (0, assert_1.default)(!(filterr instanceof Promise));
                        const filterRepelled = (0, filter_1.checkFilterRepel)(entity, context, filterr, operation.filter);
                        if (filterRepelled) {
                            continue;
                        }
                    }
                    const number = trigger.fn({ operation: operation }, context, option);
                    if (number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                }
                (0, assert_1.default)(commitTriggers.length === 0, `前台不应有commitTrigger`);
            }
            else {
                // 异步context
                const execPreTrigger = async (idx) => {
                    if (idx >= preTriggers.length) {
                        return;
                    }
                    const trigger = preTriggers[idx];
                    if (trigger.filter) {
                        (0, assert_1.default)(operation.action !== 'create');
                        const { filter } = trigger;
                        const filterr = typeof filter === 'function' ? await filter(operation, context, option) : filter;
                        const filterRepelled = await (0, filter_1.checkFilterRepel)(entity, context, filterr, operation.filter);
                        if (filterRepelled) {
                            return execPreTrigger(idx + 1);
                        }
                    }
                    const number = await trigger.fn({ operation: operation }, context, option);
                    if (number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                    return execPreTrigger(idx + 1);
                };
                const execCommitTrigger = async (idx) => {
                    if (idx >= commitTriggers.length) {
                        return;
                    }
                    const trigger = commitTriggers[idx];
                    if (trigger.filter) {
                        (0, assert_1.default)(operation.action !== 'create');
                        const { filter } = trigger;
                        const filterr = typeof filter === 'function' ? await filter(operation, context, option) : filter;
                        const filterRepelled = await (0, filter_1.checkFilterRepel)(entity, context, filterr, operation.filter);
                        if (filterRepelled) {
                            return execCommitTrigger(idx + 1);
                        }
                    }
                    await this.preCommitTrigger(entity, operation, trigger, context, option);
                    return execCommitTrigger(idx + 1);
                };
                return execPreTrigger(0)
                    .then(() => execCommitTrigger(0));
            }
        }
    }
    async execVolatileTrigger(entity, trigger, context, option, rows) {
        (0, assert_1.default)(trigger.when === 'commit');
        (0, assert_1.default)(rows.length > 0);
        const { fn } = trigger;
        await fn({ rows }, context, option);
        try {
            await context.operate(entity, {
                id: await (0, __1.generateNewIdAsync)(),
                action: 'update',
                data: {
                    [Entity_1.TriggerDataAttribute]: null,
                    [Entity_1.TriggerUuidAttribute]: null,
                },
                filter: {
                    id: {
                        $in: rows.map(ele => ele.id)
                    }
                }
            }, { includedDeleted: true });
            await context.operate(entity, {
                id: await (0, __1.generateNewIdAsync)(),
                action: 'update',
                data: {
                    [Entity_1.TriggerDataAttribute]: null,
                    [Entity_1.TriggerUuidAttribute]: null,
                },
                filter: {
                    id: {
                        $in: rows.map(ele => ele.id)
                    }
                }
            }, { includedDeleted: true });
        }
        catch (err) {
            if (trigger.strict === 'takeEasy') {
                // 如果不是makeSure的就直接清空
                await context.operate(entity, {
                    id: await (0, __1.generateNewIdAsync)(),
                    action: 'update',
                    data: {
                        [Entity_1.TriggerDataAttribute]: null,
                        [Entity_1.TriggerUuidAttribute]: null,
                    },
                    filter: {
                        id: {
                            $in: rows.map(ele => ele.id)
                        }
                    }
                }, { includedDeleted: true });
            }
            throw err;
        }
    }
    /**
     * 判断一个trigger和当前modi上下文是否符合
     * trigger的默认行为是：如果是commit时机的trigger，不显式声明则只能在modi apply时执行（create时不执行）；非commit时机的trigger，不显式声明则只在modi create时执行
     * @param option
     * @param trigger
     * @returns
     */
    judgeModiTurn(option, trigger) {
        const { mt, when } = trigger;
        if (option.modiParentEntity) {
            // 在创建modi过程中，标识为apply或者未标识但为commit时执行的trigger默认不能执行
            return mt && ['both', 'create'].includes(mt) || !mt && when !== 'commit';
        }
        else if (option.applyingModi) {
            // 在应用modi过程中，标识为create或者未标识但不为commit时执行的trigger默认不能执行
            return mt && ['both', 'apply'].includes(mt) || !mt && when === 'commit';
        }
        return true;
    }
    postOperation(entity, operation, context, option, result) {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity][action]?.filter(trigger => (typeof trigger.action === 'string' && trigger.action === operation.action
            || trigger.action instanceof Array && trigger.action.includes(operation.action))
            // 加上modi的过滤条件
            && this.judgeModiTurn(option, trigger));
        if (triggers) {
            const postTriggers = triggers.filter(ele => ele.when === 'after' && (!ele.check || ele.check(operation)));
            if (context instanceof SyncRowStore_1.SyncContext) {
                for (const trigger of postTriggers) {
                    const number = trigger.fn({
                        operation: operation,
                        result: result,
                    }, context, option);
                    if (number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                }
            }
            else {
                // 异步context
                const execPostTrigger = async (idx) => {
                    if (idx >= postTriggers.length) {
                        return;
                    }
                    const trigger = postTriggers[idx];
                    const number = await trigger.fn({
                        operation: operation,
                        result: result,
                    }, context, option);
                    if (number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                    return execPostTrigger(idx + 1);
                };
                return execPostTrigger(0);
            }
        }
    }
    async checkpoint(timestamp) {
        let result = 0;
        for (const entity of this.volatileEntities) {
            const context = await this.contextBuilder();
            await context.begin();
            try {
                const rows = await context.select(entity, {
                    data: {
                        ...(0, projection_1.makeProjection)(entity, context.getSchema()),
                        [Entity_1.TriggerDataAttribute]: 1,
                        [Entity_1.TriggerUuidAttribute]: 1,
                    },
                    filter: {
                        [Entity_1.TriggerUuidAttribute]: {
                            $exists: true,
                        },
                        [Entity_1.UpdateAtAttribute]: {
                            $lt: timestamp,
                        }
                    },
                }, {
                    includedDeleted: true,
                    dontCollect: true,
                    forUpdate: true,
                });
                const grouped = (0, lodash_1.groupBy)(rows, Entity_1.TriggerUuidAttribute);
                for (const uuid in grouped) {
                    const rs = grouped[uuid];
                    const { [Entity_1.TriggerDataAttribute]: triggerData } = rs[0];
                    const { name, cxtStr, params } = triggerData;
                    await context.initialize(JSON.parse(cxtStr));
                    const trigger = this.triggerNameMap[name];
                    if (trigger) {
                        await this.execVolatileTrigger(entity, trigger, context, params, rs);
                    }
                }
                await context.commit();
            }
            catch (err) {
                await context.rollback();
                this.logger.error(`执行checkpoint时出错，对象是「${entity}」，异常是`, err);
            }
        }
        return result;
    }
}
exports.TriggerExecutor = TriggerExecutor;
