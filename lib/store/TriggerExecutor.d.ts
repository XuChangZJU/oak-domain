import { EntityDict, OperateParams } from "../types/Entity";
import { Logger } from "../types/Logger";
import { Checker } from '../types/Auth';
import { Context } from '../types/Context';
import { Trigger, Executor } from "../types/Trigger";
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
export declare class TriggerExecutor<ED extends EntityDict, Cxt extends Context<ED>> extends Executor<ED, Cxt> {
    private counter;
    private triggerMap;
    private triggerNameMap;
    private volatileEntities;
    private logger;
    private contextBuilder;
    constructor(contextBuilder: (scene: string) => Cxt, logger?: Logger);
    registerChecker<T extends keyof ED>(checker: Checker<ED, T, Cxt>): void;
    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    unregisterTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    private preCommitTrigger;
    preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Cxt, params?: OperateParams): Promise<void>;
    private onCommit;
    private postCommitTrigger;
    postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Cxt, params?: OperateParams): Promise<void>;
    checkpoint(context: Cxt, timestamp: number): Promise<number>;
}
