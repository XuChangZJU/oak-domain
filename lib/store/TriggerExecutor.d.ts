import { EntityDict, OperateOption, SelectOption } from "../types/Entity";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { Logger } from "../types/Logger";
import { Checker } from '../types/Auth';
import { Trigger, VolatileTrigger } from "../types/Trigger";
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
    private onVolatileTrigger;
    constructor(contextBuilder: (cxtString?: string) => Promise<Cxt>, logger?: Logger, onVolatileTrigger?: <T extends keyof ED>(entity: T, trigger: VolatileTrigger<ED, T, Cxt>, ids: string[], cxtStr: string, option: OperateOption) => Promise<void>);
    setOnVolatileTrigger(onVolatileTrigger: <T extends keyof ED>(entity: T, trigger: VolatileTrigger<ED, T, Cxt>, ids: string[], cxtStr: string, option: OperateOption) => Promise<void>): void;
    registerChecker<T extends keyof ED>(checker: Checker<ED, T, Cxt>): void;
    registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    unregisterTrigger<T extends keyof ED>(trigger: Trigger<ED, T, Cxt>): void;
    private preCommitTrigger;
    private postCommitTrigger;
    preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'] & {
        action: 'select';
    }, context: Cxt, option: OperateOption | SelectOption): Promise<void> | void;
    execVolatileTrigger<T extends keyof ED>(entity: T, name: string, ids: string[], context: Cxt, option: OperateOption): Promise<void>;
    /**
     * 判断一个trigger和当前modi上下文是否符合
     * trigger的默认行为是：如果是commit时机的trigger，不显式声明则只能在modi apply时执行（create时不执行）；非commit时机的trigger，不显式声明则只在modi create时执行
     * @param option
     * @param trigger
     * @returns
     */
    private judgeModiTurn;
    postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'] & {
        action: 'select';
    }, context: Cxt, option: OperateOption | SelectOption, result?: Partial<ED[T]['Schema']>[]): Promise<void> | void;
    checkpoint(timestamp: number): Promise<number>;
}
