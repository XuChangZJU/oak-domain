"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
