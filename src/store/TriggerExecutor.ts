import assert from 'assert';
import { pull, unset } from "../utils/lodash";
import { addFilterSegment } from "../store/filter";
import { DeduceCreateOperation, EntityDict, OperateOption, SelectOption, SelectRowShape } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { Logger } from "../types/Logger";
import { Checker } from '../types/Auth';
import { Context } from '../types/Context';
import { Trigger, Executor, CreateTriggerCrossTxn, CreateTrigger, CreateTriggerInTxn, SelectTriggerAfter, CheckerType } from "../types/Trigger";

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

export class TriggerExecutor<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>> extends Executor<ED, Cxt> {
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
    private contextBuilder: (cxtString: string) => Promise<Cxt>;

    constructor(contextBuilder: (cxtString: string) => Promise<Cxt>, logger: Logger = console) {
        super();
        this.contextBuilder = contextBuilder;
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
        this.counter = 0;
    }

    registerChecker<T extends keyof ED>(checker: Checker<ED, T, Cxt>): void {
        const { entity, action, checker: checkFn, type } = checker;
        const triggerName = `${String(entity)}${action}权限检查-${this.counter++}`;

        const trigger = {
            checkerType: type,
            name: triggerName,
            entity,
            action,
            fn: checkFn,
            when: 'before',
        } as CreateTriggerInTxn<ED, T, Cxt>;
        this.registerTrigger(trigger);
    }

    getCheckers<T extends keyof ED>(entity: T, action: ED[T]['Action'], checkerTypes?: CheckerType[]) {
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => (typeof trigger.action === 'string' && trigger.action === action || (trigger.action).includes(action as any))
                && (!checkerTypes || trigger.checkerType && checkerTypes.includes(trigger.checkerType))
        );
        return triggers;
    }

    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void {
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error(`不可有同名的触发器「${trigger.name}」`);
        }
        Object.assign(this.triggerNameMap, {
            [trigger.name]: trigger,
        });

        const addTrigger = (action: string) => {
            const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity]![action];
            if (triggers) {
                triggers.push(trigger);
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
        if ((trigger as CreateTriggerCrossTxn<ED, T, Cxt>).strict === 'makeSure') {
            switch (operation.action) {
                case 'create': {
                    if (operation.data.hasOwnProperty(Executor.dataAttr) || operation.data.hasOwnProperty(Executor.timestampAttr)) {
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
                    const { rowStore } = context;
                    const count = await rowStore.count(entity, {
                        filter: filter2
                    } as Omit<ED[T]['Selection'], 'action' | 'sorter' | 'data'>, context, {});
                    if (count > 0) {
                        throw new Error(`对象${String(entity)}的行「${JSON.stringify(operation)}」上已经存在未完成的跨事务约束`);
                    }
                    break;
                }
            }

            Object.assign(operation.data, {
                [Executor.dataAttr]: {
                    name: trigger.name,
                    operation,
                    cxtStr: await context.toString(),
                    params: option,
                },
                [Executor.timestampAttr]: Date.now(),
            });
        }
    }

    async preOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption
    ): Promise<void> {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action as any)
        );
        if (triggers) {
            const preTriggers = triggers.filter(
                ele => ele.when === 'before' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as DeduceCreateOperation<ED[T]['Schema']>))
            );

            for (const trigger of preTriggers) {
                const number = await (trigger as CreateTrigger<ED, T, Cxt>).fn({ operation: operation as DeduceCreateOperation<ED[T]['Schema']> }, context, option as OperateOption);
                if (number > 0) {
                    this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                }
            }

            const commitTriggers = triggers.filter(
                ele => ele.when === 'commit' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as DeduceCreateOperation<ED[T]['Schema']>))
            );

            for (const trigger of commitTriggers) {
                await this.preCommitTrigger(entity, operation, trigger, context, option as OperateOption);
            }
        }
    }

    private onCommit<T extends keyof ED>(
        trigger: Trigger<ED, T, Cxt>, operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' }, cxtStr: string, option: OperateOption) {
        return async () => {
            const context = await this.contextBuilder(cxtStr);
            await context.begin();
            const number = await (trigger as CreateTrigger<ED, T, Cxt>).fn({
                operation: operation as DeduceCreateOperation<ED[T]['Schema']>,
            }, context, option);
            const { rowStore } = context;
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

                await rowStore.operate(trigger.entity, {
                    id: 'aaa',
                    action: 'update',
                    data: {
                        $$triggerTimestamp$$: null,
                        $$triggerData$$: null,
                    },
                    ...filter /** as Filter<'update', DeduceFilter<ED[T]['Schema']>> */,
                }, context, {});
            }

            await context.commit();
            return;
        };
    }

    private async postCommitTrigger<T extends keyof ED>(
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        trigger: Trigger<ED, T, Cxt>,
        context: Cxt,
        option: OperateOption,
    ) {
        context.on('commit', this.onCommit(trigger, operation, await context.toString(), option));
    }

    async postOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption,
        result?: SelectRowShape<ED[T]['Schema'], ED[T]['Selection']['data']>[],
    ): Promise<void> {
        const { action } = operation;
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![action]?.filter(
            trigger => typeof trigger.action === 'string' && trigger.action === operation.action || (trigger.action).includes(operation.action as any)
        );
        if (triggers) {
            const postTriggers = triggers.filter(
                ele => ele.when === 'after' && (!(ele as CreateTrigger<ED, T, Cxt>).check || (ele as CreateTrigger<ED, T, Cxt>).check!(operation as DeduceCreateOperation<ED[T]['Schema']>))
            );

            for (const trigger of postTriggers) {
                const number = await (trigger as SelectTriggerAfter<ED, T, Cxt>).fn({
                    operation: operation as ED[T]['Selection'],
                    result: result!,
                }, context, option as SelectOption);
                if (number > 0) {
                    this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                }
            }

            const commitTriggers = (<Array<CreateTrigger<ED, T, Cxt>>>triggers).filter(
                ele => ele.when === 'commit' && (!ele.check || ele.check(operation as DeduceCreateOperation<ED[T]['Schema']>))
            );

            for (const trigger of commitTriggers) {
                await this.postCommitTrigger(operation, trigger, context, option as OperateOption);
            }
        }
    }

    async checkpoint(context: Cxt, timestamp: number): Promise<number> {
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
            } as any, context, {
                dontCollect: true,
                forUpdate: true,
            });
            for (const row of rows) {
                const { $$triggerData$$ } = row;
                const { name, operation, cxtStr, params } = $$triggerData$$!;
                const trigger = this.triggerNameMap[name];
                await this.onCommit(trigger, operation as ED[typeof entity]['Operation'], cxtStr, params)();
            }

        }
        return result;
    }
}
