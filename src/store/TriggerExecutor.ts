import assert from 'assert';
import { pull, unset } from "../utils/lodash";
import { addFilterSegment, checkFilterRepel } from "../store/filter";
import { EntityDict, OperateOption, SelectOption, TriggerDataAttribute, TriggerTimestampAttribute } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { Logger } from "../types/Logger";
import { Checker, CheckerType, LogicalChecker, RelationChecker } from '../types/Auth';
import { Trigger, CreateTriggerCrossTxn, CreateTrigger, CreateTriggerInTxn, SelectTriggerAfter, UpdateTrigger, TRIGGER_DEFAULT_PRIORITY, CHECKER_DEFAULT_PRIORITY, DATA_CHECKER_DEFAULT_PRIORITY, TRIGGER_MAX_PRIORITY, TRIGGER_MIN_PRIORITY } from "../types/Trigger";
import { AsyncContext } from './AsyncRowStore';
import { SyncContext } from './SyncRowStore';
import { translateCheckerInAsyncContext } from './checker';

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

export class TriggerExecutor<ED extends EntityDict & BaseEntityDict> {
    private counter: number;
    private triggerMap: {
        [T in keyof ED]?: {
            [A: string]: Array<Trigger<ED, T, AsyncContext<ED>>>;
        };
    };
    private triggerNameMap: {
        [N: string]: Trigger<ED, keyof ED, AsyncContext<ED>>;
    };
    private volatileEntities: Array<keyof ED>;

    private logger: Logger;
    private contextBuilder: (cxtString: string) => Promise<AsyncContext<ED>>;

    constructor(contextBuilder: (cxtString: string) => Promise<AsyncContext<ED>>, logger: Logger = console) {
        this.contextBuilder = contextBuilder;
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
        this.counter = 0;
    }

    registerChecker<T extends keyof ED, Cxt extends AsyncContext<ED>>(checker: Checker<ED, T, Cxt>): void {
        const { entity, action, type, conditionalFilter } = checker;
        const triggerName = `${String(entity)}${action}权限检查-${this.counter++}`;
        const { fn, when } = translateCheckerInAsyncContext(checker);
        const priority = type === 'data' ? DATA_CHECKER_DEFAULT_PRIORITY : CHECKER_DEFAULT_PRIORITY;        // checker的默认优先级最低（前面的trigger可能会赋上一些相应的值）
        const trigger = {
            checkerType: type,
            name: triggerName,
            priority: checker.priority || priority,
            entity,
            action: action as 'update',
            fn,
            when,
            filter: conditionalFilter,
        } as UpdateTrigger<ED, T, Cxt>;
        this.registerTrigger(trigger);
    }

    getCheckers<T extends keyof ED>(entity: T, action: ED[T]['Action'], checkerTypes?: CheckerType[]) {
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => (typeof trigger.action === 'string' && trigger.action === action || trigger.action instanceof Array && trigger.action.includes(action as any)
                && (!checkerTypes || trigger.checkerType && checkerTypes.includes(trigger.checkerType)))
        );
        return triggers;
    }

    registerTrigger<T extends keyof ED, Cxt extends AsyncContext<ED>>(trigger: Trigger<ED, T, Cxt>): void {
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error(`不可有同名的触发器「${trigger.name}」`);
        }
        if (typeof trigger.priority !== 'number') {
            trigger.priority = TRIGGER_DEFAULT_PRIORITY;       // 默认值
        }
        else {
            assert(trigger.priority <= TRIGGER_MAX_PRIORITY && trigger.priority >= TRIGGER_MIN_PRIORITY, `trigger「${trigger.name}」的优先级定义越界，应该在${TRIGGER_MIN_PRIORITY}到${TRIGGER_MAX_PRIORITY}之间`);
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
                triggers.splice(idx, 0, trigger as Trigger<ED, T, AsyncContext<ED>>);
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

    unregisterTrigger<T extends keyof ED, Cxt extends AsyncContext<ED>>(trigger: Trigger<ED, T, Cxt>): void {
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

    private async preCommitTrigger<T extends keyof ED, Cxt extends AsyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        trigger: Trigger<ED, T, Cxt>,
        context: Cxt,
        option: OperateOption
    ) {
        assert(trigger.action !== 'select');
        if ((trigger as CreateTriggerCrossTxn<ED, T, Cxt>).strict === 'makeSure') {
            switch (operation.action) {
                case 'create': {
                    if (operation.data.hasOwnProperty(TriggerDataAttribute) || operation.data.hasOwnProperty(TriggerTimestampAttribute)) {
                        throw new Error('同一行数据上不能存在两个跨事务约束');
                    }
                    break;
                }
                default: {
                    const { filter } = operation;
                    // 此时要保证更新或者删除的行上没有跨事务约束
                    const filter2 = addFilterSegment({
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
                    const count = await context.count(entity, {
                        filter: filter2
                    } as Omit<ED[T]['Selection'], 'action' | 'sorter' | 'data'>, {});
                    if (count > 0) {
                        throw new Error(`对象${String(entity)}的行「${JSON.stringify(operation)}」上已经存在未完成的跨事务约束`);
                    }
                    break;
                }
            }

            Object.assign(operation.data, {
                [TriggerDataAttribute]: {
                    name: trigger.name,
                    operation,
                    cxtStr: context.toString(),
                    params: option,
                },
                [TriggerTimestampAttribute]: Date.now(),
            });
        }
    }

    preOperation<T extends keyof ED, Cxt extends AsyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption
    ): Promise<void> | void {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action as any)
        );
        if (triggers) {
            const preTriggers = triggers.filter(
                ele => ele.when === 'before' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as ED[T]['Create']))
            );
            const commitTriggers = triggers.filter(
                ele => ele.when === 'commit' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as ED[T]['Create']))
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
                    const number = (trigger as CreateTrigger<ED, T, Cxt>).fn({ operation: operation as ED[T]['Create'] }, context, option as OperateOption);
                    if (number > 0) {
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
                    const number = await (trigger as CreateTrigger<ED, T, Cxt>).fn({ operation: operation as ED[T]['Create'] }, context, option as OperateOption);
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

    private onCommit<T extends keyof ED, Cxt extends AsyncContext<ED>>(
        trigger: Trigger<ED, T, Cxt>, operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' }, context: AsyncContext<ED>, option: OperateOption) {
        return async () => {
            await context.begin();
            const number = await (trigger as CreateTrigger<ED, T, AsyncContext<ED>>).fn({
                operation: operation as ED[T]['Create'],
            }, context, option);
            if ((trigger as CreateTriggerCrossTxn<ED, T, Cxt>).strict === 'makeSure') {
                // 如果是必须完成的trigger，在完成成功后要把trigger相关的属性置null;
                let filter = {};
                if (operation.action === 'create') {
                    filter = operation.data instanceof Array ? {
                        filter: {
                            id: {
                                $in: operation.data.map(ele => (ele.id as string)),
                            },
                        },
                    } : {
                        filter: {
                            id: (operation.data.id as string),
                        }
                    };
                }
                else if (operation.filter) {
                    Object.assign(filter, { filter: operation.filter });
                }

                await context.operate(trigger.entity, {
                    id: 'aaa',
                    action: 'update',
                    data: {
                        $$triggerTimestamp$$: null,
                        $$triggerData$$: null,
                    },
                    ...filter /** as Filter<'update', DeduceFilter<ED[T]['Schema']>> */,
                }, {});
            }

            await context.commit();
            return;
        };
    }

    private async postCommitTrigger<T extends keyof ED, Cxt extends AsyncContext<ED>>(
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        trigger: Trigger<ED, T, Cxt>,
        context: AsyncContext<ED>,
        option: OperateOption,
    ) {
        context.on('commit', this.onCommit(trigger, operation, context, option));
    }

    postOperation<T extends keyof ED, Cxt extends AsyncContext<ED>>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption,
        result?: Partial<ED[T]['Schema']>[],
    ): Promise<void> | void {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action as any)
        );
        if (triggers) {
            const postTriggers = triggers.filter(
                ele => ele.when === 'after' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as ED[T]['Create']))
            );
            const commitTriggers = (<Array<CreateTrigger<ED, T, Cxt>>>triggers).filter(
                ele => ele.when === 'commit' && (!ele.check || ele.check(operation as ED[T]['Create']))
            );

            if (context instanceof SyncContext) {
                for (const trigger of postTriggers) {
                    const number = (trigger as SelectTriggerAfter<ED, T, Cxt>).fn({
                        operation: operation as ED[T]['Selection'],
                        result: result!,
                    }, context, option as SelectOption);
                    if (number > 0) {
                        this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                    }
                }
                assert(commitTriggers.length === 0, '前台目前应当没有commitTrigger');
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
                const execCommitTrigger = async (idx: number): Promise<void> => {
                    if (idx >= commitTriggers.length) {
                        return;
                    }
                    const trigger = commitTriggers[idx];
                    await this.postCommitTrigger(operation, trigger, context, option as OperateOption);
                    return execCommitTrigger(idx + 1);
                };
                return execPostTrigger(0)
                    .then(
                        () => execCommitTrigger(0)
                    );
            }
        }
    }

    async checkpoint<Cxt extends AsyncContext<ED>>(context: Cxt, timestamp: number): Promise<number> {
        let result = 0;
        for (const entity of this.volatileEntities) {
            const rows = await context.select(entity, {
                data: {
                    id: 1,
                    $$triggerData$$: 1,
                },
                filter: {
                    $$triggerTimestamp$$: {
                        $gt: timestamp,
                    }
                },
            } as any, {
                dontCollect: true,
                forUpdate: true,
            });
            for (const row of rows) {
                const { $$triggerData$$ } = row;
                const { name, operation, cxtStr, params } = $$triggerData$$!;
                const trigger = this.triggerNameMap[name];
                const context = await this.contextBuilder(cxtStr);
                await this.onCommit(trigger, operation as ED[typeof entity]['Operation'], context as AsyncContext<ED>, params)();
            }

        }
        return result;
    }
}
