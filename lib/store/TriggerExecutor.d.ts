import { EntityDict, OperateOption, SelectOption, SelectRowShape } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { Logger } from "../types/Logger";
import { Checker } from '../types/Auth';
import { Context } from '../types/Context';
import { Trigger, Executor, CheckerType } from "../types/Trigger";
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
export declare class TriggerExecutor<ED extends EntityDict & BaseEntityDict, Cxt extends Context<ED>> extends Executor<ED, Cxt> {
    private counter;
    private triggerMap;
    private triggerNameMap;
    private volatileEntities;
    private logger;
    private contextBuilder;
    constructor(contextBuilder: (cxtString: string) => Promise<Cxt>, logger?: Logger);
    registerChecker<T extends keyof ED>(checker: Checker<ED, T, Cxt>): void;
    getCheckers<T extends keyof ED>(entity: T, action: ED[T]['Action'], checkerTypes?: CheckerType[]): Trigger<ED, T, Cxt>[] | undefined;
    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    unregisterTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    private preCommitTrigger;
    preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'] & {
        action: 'select';
    }, context: Cxt, option: OperateOption | SelectOption): Promise<void>;
    private onCommit;
    private postCommitTrigger;
    postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'] & {
        action: 'select';
    }, context: Cxt, option: OperateOption | SelectOption, result?: SelectRowShape<ED[T]['Schema'], ED[T]['Selection']['data']>[]): Promise<void>;
    checkpoint(context: Cxt, timestamp: number): Promise<number>;
}
