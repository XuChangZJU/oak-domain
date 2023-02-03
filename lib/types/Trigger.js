"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMOVE_CASCADE_PRIORITY = exports.CHECKER_DEFAULT_PRIORITY = exports.DATA_CHECKER_DEFAULT_PRIORITY = exports.TRIGGER_MAX_PRIORITY = exports.TRIGGER_MIN_PRIORITY = exports.TRIGGER_DEFAULT_PRIORITY = void 0;
/**
 * 优先级越小，越早执行。定义在1～99之间
 */
exports.TRIGGER_DEFAULT_PRIORITY = 50;
exports.TRIGGER_MIN_PRIORITY = 1;
exports.TRIGGER_MAX_PRIORITY = 99;
exports.DATA_CHECKER_DEFAULT_PRIORITY = 60;
exports.CHECKER_DEFAULT_PRIORITY = 99;
exports.REMOVE_CASCADE_PRIORITY = 70;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
/* export abstract class Executor<ED extends EntityDict, Cxt extends AsyncContext<ED>> {
    static dataAttr: TriggerDataAttribute = '$$triggerData$$';
    static timestampAttr: TriggerTimestampAttribute = '$$triggerTimestamp$$';

    abstract registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void;

    abstract preOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption
    ): Promise<void>;

    abstract postOperation<T extends keyof ED>(
        entity: T,
        operation: ED[T]['Operation'] | ED[T]['Selection'] & { action: 'select' },
        context: Cxt,
        option: OperateOption | SelectOption,
        result?: SelectRowShape<ED[T]['Schema'], ED[T]['Selection']['data']>[]
    ): Promise<void>;

    abstract checkpoint(context: Cxt, timestamp: number): Promise<number>;    // 将所有在timestamp之前存在不一致的数据进行恢复
} */
