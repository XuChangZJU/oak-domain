import assert from 'assert';
import { pull, unset, groupBy } from "../utils/lodash";
import { checkFilterRepel, combineFilters } from "../store/filter";
import { EntityDict, OperateOption, SelectOption, TriggerDataAttribute, TriggerUuidAttribute, UpdateAtAttribute } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { Logger } from "../types/Logger";
import { Checker, CheckerType, LogicalChecker, RelationChecker } from '../types/Auth';
import { Trigger, CreateTriggerCrossTxn, CreateTrigger, CreateTriggerInTxn, SelectTriggerAfter, UpdateTrigger, TRIGGER_DEFAULT_PRIORITY, CHECKER_PRIORITY_MAP, CHECKER_MAX_PRIORITY, TRIGGER_MIN_PRIORITY } from "../types/Trigger";
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';
import { translateCheckerInAsyncContext } from './checker';
import { makeProjection } from '../utils/projection';
import { generateNewIdAsync } from '../utils/uuid';

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

export class TriggerExecutor<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    private counter: number;
    private triggerMap: {
        [T in keyof ED]?: {
            [A: string]: Array<Trigger<ED, T, Cxt>>;
        };
    };
    private triggerNameMap: {
        [N: string]: Trigger<ED, keyof ED, Cxt>;
    };
    private volatileEntities: Array<keyof ED>;

    private logger: Logger;
    private contextBuilder: (cxtString?: string) => Promise<Cxt>;

    constructor(contextBuilder: (cxtString?: string) => Promise<Cxt>, logger: Logger = console) {
        this.contextBuilder = contextBuilder;
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
        this.counter = 0;
    }

    registerChecker<T extends keyof ED>(checker: Checker<ED, T, Cxt>): void {
        const { entity, action, type, conditionalFilter, mt } = checker;
        const triggerName = `${String(entity)}${action}权限检查-${this.counter++}`;
        const { fn, when } = translateCheckerInAsyncContext(checker);

        const trigger = {
            checkerType: type,
            name: triggerName,
            priority: checker.priority || CHECKER_PRIORITY_MAP[type],
            entity,
            action: action as 'update',
            fn,
            when,
            mt,
            filter: conditionalFilter,
        } as UpdateTrigger<ED, T, Cxt>;
        this.registerTrigger(trigger);
    }

    /*  getCheckers<T extends keyof ED>(entity: T, action: ED[T]['Action'], checkerTypes?: CheckerType[]) {
         const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
             trigger => (typeof trigger.action === 'string' && trigger.action === action || trigger.action instanceof Array && trigger.action.includes(action as any)
                 && (!checkerTypes || trigger.checkerType && checkerTypes.includes(trigger.checkerType)))
         );
         return triggers;
     } */

    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void {
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error(`不可有同名的触发器「${trigger.name}」`);
        }
        if (typeof trigger.priority !== 'number') {
            trigger.priority = TRIGGER_DEFAULT_PRIORITY;       // 默认值
        }
        else {
            assert(trigger.priority <= CHECKER_MAX_PRIORITY && trigger.priority >= TRIGGER_MIN_PRIORITY, `trigger「${trigger.name}」的优先级定义越界，应该在${TRIGGER_MIN_PRIORITY}到${CHECKER_MAX_PRIORITY}之间`);
        }
        if ((trigger as UpdateTrigger<ED, T, Cxt>).filter) {
            assert(typeof trigger.action === 'string' && trigger.action !== 'create'
                || trigger.action instanceof Array && !(trigger.action as any[]).includes('create'), `trigger【${trigger.name}】是create类型但却带有filter`);
            assert(trigger.when === 'before' || trigger.when === 'commit', `定义了filter的trigger【${trigger.name}】的when只能是before或者commit`);
        }
        Object.assign(this.triggerNameMap, {
            [trigger.name]: trigger,
        });

        const addTrigger = (action: string) => {
            const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity]![action];
            if (triggers) {
                let idx;
                // 这里可以保持有序插入，后面取trigger的时候就不用排序了
                for (idx = 0; idx < triggers.length; idx++) {
                    if (triggers[idx].priority! > trigger.priority!) {
                        break;
                    }
                }
                triggers.splice(idx, 0, trigger as Trigger<ED, T, Cxt>);
            }
            else if (this.triggerMap[trigger.entity]) {
                Object.assign(this.triggerMap[trigger.entity]!, {
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
            trigger.action.forEach(
                ele => addTrigger(ele)
            )
        }

        if (trigger.when === 'commit' && trigger.strict === 'makeSure') {
            if (this.volatileEntities.indexOf(trigger.entity) === -1) {
                this.volatileEntities.push(trigger.entity);
            }
        }
    }

    unregisterTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void {
        assert(trigger.when !== 'commit' || trigger.strict !== 'makeSure', 'could not remove strict volatile triggers');

        const removeTrigger = (action: string) => {
            const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity]![action];
            if (triggers) {
                pull(triggers!, trigger);
                unset(this.triggerNameMap, trigger.name);
            }
        };

        if (typeof trigger.action === 'string') {
            removeTrigger(trigger.action);
        }
        else {
            trigger.action.forEach(
                ele => removeTrigger(ele)
            );
        }
    }

    private async preCommitTrigger<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        trigger: Trigger<ED, T, Cxt>,
        context: Cxt,
        option: OperateOption
    ) {
        assert(trigger.action !== 'select');
        assert(trigger.when === 'commit');
        const uuid = await generateNewIdAsync();
        const cxtStr = context.toString();
        const { data } = operation;
        switch (operation.action) {
            case 'create': {
                if (data instanceof Array) {
                    data.forEach(
                        (d) => {
                            if (d.hasOwnProperty(TriggerDataAttribute) || d.hasOwnProperty(TriggerUuidAttribute)) {
                                throw new Error('同一行数据上不能同时存在两个跨事务约束');
                            }
                        }
                    )
                }
                else {
                    if (data.hasOwnProperty(TriggerDataAttribute) || data.hasOwnProperty(TriggerUuidAttribute)) {
                        throw new Error('同一行数据上不能存在两个跨事务约束');
                    }

                }
                break;
            }
            default: {
                const { filter } = operation;
                // 此时要保证更新或者删除的行上没有跨事务约束
                const filter2 = combineFilters(entity, context.getSchema(), [{
                    [TriggerUuidAttribute]: {
                        $exists: true,
                    },
                }, filter]);
                const count = await context.count(entity, {
                    filter: filter2
                } as Omit<ED[T]['Selection'], 'action' | 'sorter' | 'data'>, {});
                if (count > 0) {
                    throw new Error(`对象${String(entity)}的行「${JSON.stringify(operation)}」上已经存在未完成的跨事务约束`);
                }
                break;
            }
        }

        if (data instanceof Array) {
            data.forEach(
                (d) => {
                    Object.assign(d, {
                        [TriggerDataAttribute]: {
                            name: trigger.name,
                            cxtStr: context.toString(),
                            params: option,
                        },
                        [TriggerUuidAttribute]: uuid,
                    });
                }
            );
        }
        else {
            Object.assign(data, {
                [TriggerDataAttribute]: {
                    name: trigger.name,
                    cxtStr,
                    params: option,
                },
                [TriggerUuidAttribute]: uuid,
            });
        }

        context.on('commit', async () => {
            const context2 = await this.contextBuilder(cxtStr);
            await context2.begin();

            try {
                const rows = await context2.select(entity, {
                    data: {
                        ...makeProjection(entity, context.getSchema()),
                        [TriggerDataAttribute]: 1,
                        [TriggerUuidAttribute]: 1,
                    },
                    filter: {
                        [TriggerUuidAttribute]: uuid,
                    },
                }, {
                    includedDeleted: true,
                }) as ED[T]['OpSchema'][];
                if (rows.length > 0) {
                    await this.execVolatileTrigger(entity, trigger, context2, option, rows);
                }
                else {
                    // 如果是前台开发模式，debugStore不会保留删除行
                    assert(process.env.OAK_PLATFORM !== 'server' && operation.action === 'remove');
                }

                await context2.commit();
            }
            catch (err) {
                await context2.rollback();
                this.logger.error(err);
            }
        });
    }

    preOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption
    ): Promise<void> | void {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => (typeof trigger.action === 'string' && trigger.action === operation.action
                || trigger.action instanceof Array && (trigger.action as string[]).includes(operation.action))
                // 加上modi的过滤条件
                && this.judgeModiTurn(option, trigger)

        );
        if (triggers) {
            const preTriggers = triggers.filter(
                ele => ele.when === 'before' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as ED[T]['Create']))
            );
            const commitTriggers = triggers.filter(
                ele => ele.when === 'commit' &&
                    (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as ED[T]['Create']))
            );

            if (context instanceof SyncContext) {
                for (const trigger of preTriggers) {
                    if ((trigger as UpdateTrigger<ED, T, Cxt>).filter) {
                        // trigger只对满足条件的前项进行判断，如果确定不满足可以pass
                        assert(operation.action !== 'create');
                        const { filter } = trigger as UpdateTrigger<ED, T, Cxt>;
                        const filterr = typeof filter === 'function' ? filter(operation as ED[T]['Update'], context, option) : filter;
                        assert(!(filterr instanceof Promise));
                        const filterRepelled = checkFilterRepel<ED, T, Cxt>(entity, context, filterr, operation.filter) as boolean
                        if (filterRepelled) {
                            continue;
                        }
                    }
                    const number = (trigger as CreateTriggerInTxn<ED, T, Cxt>).fn({ operation: operation as ED[T]['Create'] }, context, option as OperateOption);
                    if (number as number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                }
                assert(commitTriggers.length === 0, `前台不应有commitTrigger`);
            }
            else {
                // 异步context
                const execPreTrigger = async (idx: number): Promise<void> => {
                    if (idx >= preTriggers.length) {
                        return;
                    }
                    const trigger = preTriggers[idx];
                    if ((trigger as UpdateTrigger<ED, T, Cxt>).filter) {
                        assert(operation.action !== 'create');
                        const { filter } = trigger as UpdateTrigger<ED, T, Cxt>;
                        const filterr = typeof filter === 'function' ? await filter(operation as ED[T]['Update'], context, option) : filter;
                        const filterRepelled = await (checkFilterRepel<ED, T, Cxt>(entity, context, filterr, operation.filter) as Promise<boolean>);
                        if (filterRepelled) {
                            return execPreTrigger(idx + 1);
                        }
                    }
                    const number = await (trigger as CreateTriggerInTxn<ED, T, Cxt>).fn({ operation: operation as ED[T]['Create'] }, context, option as OperateOption);
                    if (number as number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                    return execPreTrigger(idx + 1);
                };
                const execCommitTrigger = async (idx: number): Promise<void> => {
                    if (idx >= commitTriggers.length) {
                        return;
                    }
                    const trigger = commitTriggers[idx];
                    if ((trigger as UpdateTrigger<ED, T, Cxt>).filter) {
                        assert(operation.action !== 'create');
                        const { filter } = trigger as UpdateTrigger<ED, T, Cxt>;
                        const filterr = typeof filter === 'function' ? await filter(operation as ED[T]['Update'], context, option) : filter;
                        const filterRepelled = await (checkFilterRepel<ED, T, Cxt>(entity, context, filterr, operation.filter) as Promise<boolean>);
                        if (filterRepelled) {
                            return execCommitTrigger(idx + 1);
                        }
                    }
                    await this.preCommitTrigger(entity, operation, trigger, context, option as OperateOption);
                    return execCommitTrigger(idx + 1);
                };
                return execPreTrigger(0)
                    .then(
                        () => execCommitTrigger(0)
                    );
            }
        }
    }

    private async execVolatileTrigger<T extends keyof ED>(
        entity: T,
        trigger: Trigger<ED, T, Cxt>,
        context: Cxt,
        option: OperateOption,
        rows: ED[T]['OpSchema'][]
    ) {
        assert(trigger.when === 'commit');
        assert(rows.length > 0);
        const { fn } = trigger as CreateTriggerCrossTxn<ED, T, Cxt>;
        await fn({ rows }, context, option);
        try {
            await context.operate(entity, {
                id: await generateNewIdAsync(),
                action: 'update',
                data: {
                    [TriggerDataAttribute]: null,
                    [TriggerUuidAttribute]: null,
                },
                filter: {
                    id: {
                        $in: rows.map(ele => ele.id!)
                    }
                }
            }, { includedDeleted: true });
            await context.operate(entity, {
                id: await generateNewIdAsync(),
                action: 'update',
                data: {
                    [TriggerDataAttribute]: null,
                    [TriggerUuidAttribute]: null,
                },
                filter: {
                    id: {
                        $in: rows.map(ele => ele.id!)
                    }
                }
            }, { includedDeleted: true });
        }
        catch (err) {
            if (trigger.strict === 'takeEasy') {
                // 如果不是makeSure的就直接清空
                await context.operate(entity, {
                    id: await generateNewIdAsync(),
                    action: 'update',
                    data: {
                        [TriggerDataAttribute]: null,
                        [TriggerUuidAttribute]: null,
                    },
                    filter: {
                        id: {
                            $in: rows.map(ele => ele.id!)
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
    private judgeModiTurn<T extends keyof ED>(option: OperateOption, trigger: Trigger<ED, T, Cxt>) {
        const { mt, when } = trigger as CreateTrigger<ED, T, Cxt>;
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

    postOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption,
        result?: Partial<ED[T]['Schema']>[],
    ): Promise<void> | void {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => (typeof trigger.action === 'string' && trigger.action === operation.action
                || trigger.action instanceof Array && (trigger.action as string[]).includes(operation.action))
                // 加上modi的过滤条件
                && this.judgeModiTurn(option, trigger)
        );
        if (triggers) {
            const postTriggers = triggers.filter(
                ele => ele.when === 'after' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as ED[T]['Create']))
            );

            if (context instanceof SyncContext) {
                for (const trigger of postTriggers) {
                    const number = (trigger as SelectTriggerAfter<ED, T, Cxt>).fn({
                        operation: operation as ED[T]['Selection'],
                        result: result!,
                    }, context, option as SelectOption);
                    if (number as number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                }
            }
            else {
                // 异步context
                const execPostTrigger = async (idx: number): Promise<void> => {
                    if (idx >= postTriggers.length) {
                        return;
                    }
                    const trigger = postTriggers[idx];
                    const number = await (trigger as SelectTriggerAfter<ED, T, Cxt>).fn({
                        operation: operation as ED[T]['Selection'],
                        result: result!,
                    }, context, option as SelectOption);
                    if (number as number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                    return execPostTrigger(idx + 1);
                };
                return execPostTrigger(0);
            }
        }
    }

    async checkpoint(timestamp: number): Promise<number> {
        let result = 0;
        for (const entity of this.volatileEntities) {
            const context = await this.contextBuilder();
            await context.begin();
            try {
                const rows = await context.select(entity, {
                    data: {
                        ...makeProjection(entity, context.getSchema()),
                        [TriggerDataAttribute]: 1,
                        [TriggerUuidAttribute]: 1,
                    },
                    filter: {
                        [TriggerUuidAttribute]: {
                            $exists: true,
                        },
                        [UpdateAtAttribute]: {
                            $lt: timestamp,
                        }
                    },
                } as any, {
                    includedDeleted: true,
                    dontCollect: true,
                    forUpdate: true,
                });

                const grouped = groupBy(rows, TriggerUuidAttribute);

                for (const uuid in grouped) {
                    const rs = grouped[uuid];
                    const { [TriggerDataAttribute]: triggerData } = rs[0];
                    const { name, cxtStr, params } = triggerData!;
                    await context.initialize(JSON.parse(cxtStr));
                    const trigger = this.triggerNameMap[name];
                    if (trigger) {
                        await this.execVolatileTrigger(entity, trigger, context, params, rs as ED[keyof ED]['OpSchema'][]);
                    }
                }
                await context.commit();
            }
            catch (err) {
                await context.rollback();
                this.logger.error(`执行checkpoint时出错，对象是「${entity as string}」，异常是`, err);
            }
        }
        return result;
    }
}
