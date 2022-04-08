import { Context } from "../types/Context";
import { EntityDict } from "../types/Entity";
import { Logger } from "../types/Logger";
import { Trigger, Executor } from "../types/Trigger";
export declare class TriggerExecutor<ED extends EntityDict> extends Executor<ED> {
    private triggerMap;
    private triggerNameMap;
    private volatileEntities;
    private logger;
    constructor(logger?: Logger);
    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void;
    private preCommitTrigger;
    preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    private onCommit;
    private postCommitTrigger;
    postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    checkpoint(context: Context<ED>, timestamp: number): Promise<number>;
}
