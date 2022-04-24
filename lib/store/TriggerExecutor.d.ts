import { EntityDict } from "../types/Entity";
import { Logger } from "../types/Logger";
import { Checker } from '../types/Auth';
import { Context } from '../types/Context';
import { Trigger, Executor } from "../types/Trigger";
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
export declare class TriggerExecutor<ED extends EntityDict> extends Executor<ED> {
    private triggerMap;
    private triggerNameMap;
    private volatileEntities;
    private logger;
    constructor(logger?: Logger);
    registerChecker<T extends keyof ED>(checker: Checker<ED, T>): void;
    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void;
    unregisterTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void;
    private preCommitTrigger;
    preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    private onCommit;
    private postCommitTrigger;
    postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    checkpoint(context: Context<ED>, timestamp: number): Promise<number>;
}
