import { Context } from "./Context";
import { EntityDef, EntityShape, OperationResult } from "./Entity";
export interface Trigger<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, T extends E, SH extends TriggerEntityShape = TriggerEntityShape> {
    name: string;
    action: ED[T]['Action'];
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    entity: T;
    check?: (operation: ED[T]['Selection'] | ED[T]['Operation']) => boolean;
    when: 'before' | 'after' | 'commit';
    strict?: 'takeEasy' | 'makeSure';
    fn: (event: {
        operation: ED[T]['Operation'];
        result?: OperationResult<E, ED, SH>;
    }, context: Context<E, ED, SH>, params?: Object) => Promise<number>;
}
export declare type DataAttr = '$$triggerData$$';
export declare type TimestampAttr = '$$triggerTimestamp$$';
export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
}
export declare abstract class Executor<E extends string, ED extends {
    [K in E]: EntityDef<E, ED, K, SH>;
}, SH extends TriggerEntityShape = TriggerEntityShape> {
    static dataAttr: DataAttr;
    static timestampAttr: TimestampAttr;
    abstract registerTrigger<T extends E>(trigger: Trigger<E, ED, T, SH>): void;
    abstract preOperation<T extends E>(entity: T, operation: ED[T]['Operation'], context: Context<E, ED, SH>): Promise<void>;
    abstract postOperation<T extends E>(entity: T, operation: ED[T]['Operation'], context: Context<E, ED, SH>): Promise<void>;
    abstract checkpoint(context: Context<E, ED, SH>, timestamp: number): Promise<number>;
}
