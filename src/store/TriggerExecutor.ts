import assert from 'assert';
import { assign } from "lodash";
import { addFilterSegment } from "../store/filter";
import { Context } from "../types/Context";
import { EntityDict } from "../types/Entity";
import { Logger } from "../types/Logger";
import { Trigger, Executor } from "../types/Trigger";

export class TriggerExecutor<ED extends EntityDict> extends Executor<ED> {
    private triggerMap: {
        [T in keyof ED]?: {
            [A: string]: Array<Trigger<ED, T>>;
        };
    };
    private triggerNameMap: {
        [N: string]: Trigger<ED, keyof ED>;
    };
    private volatileEntities: Array<keyof ED>;

    private logger: Logger;

    constructor(logger: Logger = console) {
        super();
        this.logger = logger;
        this.triggerMap = {};
        this.triggerNameMap = {};
        this.volatileEntities = [];
    }

    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void {
        // trigger的两种访问方式: by name, by entity/action
        if (this.triggerNameMap.hasOwnProperty(trigger.name)) {
            throw new Error(`不可有同名的触发器「${trigger.name}」`);
        }
        assign(this.triggerNameMap, {
            [trigger.name]: trigger,
        });

        const triggers = this.triggerMap[trigger.entity] && this.triggerMap[trigger.entity]![trigger.action];
        if (triggers) {
            triggers.push(trigger);
        }
        else if (this.triggerMap[trigger.entity]) {
            assign(this.triggerMap[trigger.entity], {
                [trigger.action]: [trigger],
            });
        }
        else {
            assign(this.triggerMap, {
                [trigger.entity]: {
                    [trigger.action]: [trigger],
                }
            });
        }

        if (trigger.when === 'commit' && trigger.strict === 'makeSure') {
            if (this.volatileEntities.indexOf(trigger.entity) === -1) {
                this.volatileEntities.push(trigger.entity);
            }
        }
    }

    private async preCommitTrigger<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'],
        trigger: Trigger<ED, T>,
        context: Context<ED>
    ) {
        assert(trigger.action !== 'select');
        if (trigger.strict === 'makeSure') {
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
                    } as Omit<ED[T]['Selection'], 'action' | 'sorter' | 'data'>, context);
                    if (count > 0) {
                        throw new Error(`对象${entity}的行「${JSON.stringify(operation)}」上已经存在未完成的跨事务约束`);
                    }
                    break;
                }
            }

            assign(operation.data, {
                [Executor.dataAttr]: {
                    name: trigger.name,
                    operation,
                },
                [Executor.timestampAttr]: Date.now(),
            });        
        }
    }

    async preOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Context<ED>
    ): Promise<void> {
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![operation.action];
        if (triggers) {
            const preTriggers = triggers.filter(
                ele => ele.when === 'before' && (!ele.check || ele.check(operation))
            );

            for (const trigger of preTriggers) {
                const number = await trigger.fn({ operation }, context);
                if (number > 0) {
                    this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                }
            }

            const commitTriggers = triggers.filter(
                ele => ele.when === 'commit' && (!ele.check || ele.check(operation))
            );

            for (const trigger of commitTriggers) {
                await this.preCommitTrigger(entity, operation, trigger, context);
            }
        }
    }

    private onCommit<T extends keyof ED>(
        trigger: Trigger<ED, T>, operation: ED[T]['Operation']) {
        return async (context: Context<ED>) => {
            await context.begin();
            const number = await trigger.fn({
                operation,
            }, context);
            const { rowStore } = context;
            if (trigger.strict === 'makeSure') {
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
                    assign(filter, { filter: operation.filter });
                }
                
                await rowStore.operate(trigger.entity, {
                    action: 'update',
                    data: {
                        $$triggerTimestamp$$: null,
                        $$triggerData$$: null,
                    } as any,
                    ...filter /** as Filter<'update', DeduceFilter<ED[T]['Schema']>> */,
                }, context);
            }

            await context.commit();
            return;
        };
    }

    private async postCommitTrigger<T extends keyof ED>(
        operation: ED[T]['Operation'],
        trigger: Trigger<ED, T>,
        context: Context<ED>
    ) {
        context.on('commit', this.onCommit(trigger, operation));
    }

    async postOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'],
        context: Context<ED>
    ): Promise<void> {
        const triggers = this.triggerMap[entity] && this.triggerMap[entity]![operation.action];
        if (triggers) {
            const postTriggers = triggers.filter(
                ele => ele.when === 'after' && (!ele.check || ele.check(operation))
            );

            for (const trigger of postTriggers) {
                const number = await trigger.fn({ operation }, context);
                if (number > 0) {
                    this.logger.info(`触发器「${trigger.name}」成功触发了「${number}」行数据更改`);
                }
            }

            const commitTriggers = (<Array<Trigger<ED, T>>>triggers).filter(
                ele => ele.when === 'commit' && (!ele.check || ele.check(operation))
            );

            for (const trigger of commitTriggers) {
                await this.postCommitTrigger(operation, trigger, context);
            }
        }
    }

    async checkpoint(context: Context<ED>, timestamp: number): Promise<number> {
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
            } as any, context);
            for (const row of rows) {
                const { $$triggerData$$ } = row;
                const { name, operation } = $$triggerData$$!;
                const trigger = this.triggerNameMap[name];
                await this.onCommit(trigger, operation as ED[typeof entity]['Operation'])(context);
            }

        }
        return result;
    }
}
