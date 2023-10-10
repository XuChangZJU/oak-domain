import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { Logger } from "../types/Logger";
import { Checker } from '../types/Auth';
import { Trigger } from "../types/Trigger";
import { AsyncContext } from './AsyncRowStore';
/**
 * update可能会传入多种不同的action，此时都需要检查update trigger
 */
export declare class TriggerExecutor<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>> {
    private counter;
    private triggerMap;
    private triggerNameMap;
    private volatileEntities;
    private logger;
    private contextBuilder;
    constructor(contextBuilder: (cxtString: string) => Promise<Cxt>, logger?: Logger);
    registerChecker<T extends keyof ED>(checker: Checker<ED, T, Cxt>): void;
    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    unregisterTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    private preCommitTrigger;
    preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'] & {
        action: 'select';
    }, context: Cxt, option: OperateOption | SelectOption): Promise<void> | void;
    private execVolatileTrigger;
    postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'] & {
        action: 'select';
    }, context: Cxt, option: OperateOption | SelectOption, result?: Partial<ED[T]['Schema']>[]): Promise<void> | void;
    checkpoint(context: Cxt, timestamp: number): Promise<number>;
}
