import { Context } from "./Context";
import { EntityDef, EntityShape, OperationResult } from "./Entity";
export interface Trigger<ED extends {
    [E: string]: EntityDef;
}, T extends keyof ED> {
    name: string;
    action: ED[T]['Action'];
    attributes?: keyof ED[T]['OpSchema'] | Array<keyof ED[T]['OpSchema']>;
    entity: T;
    check?: (operation: ED[T]['Selection'] | ED[T]['Operation']) => boolean;
    when: 'before' | 'after' | 'commit';
    strict?: 'takeEasy' | 'makeSure';
    fn: (event: {
        operation: ED[T]['Operation'];
        result?: OperationResult<ED>;
    }, context: Context<ED>, params?: Object) => Promise<number>;
}
export declare type TriggerDataAttribute = '$$triggerData$$';
export declare type TriggerTimestampAttribute = '$$triggerTimestamp$$';
export interface TriggerEntityShape extends EntityShape {
    $$triggerData$$?: {
        name: string;
        operation: object;
    };
    $$triggerTimestamp$$?: number;
}
export declare abstract class Executor<ED extends {
    [E: string]: EntityDef;
}> {
    static dataAttr: TriggerDataAttribute;
    static timestampAttr: TriggerTimestampAttribute;
    abstract registerTrigger<T extends keyof ED>(trigger: Trigger<ED, T>): void;
    abstract preOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    abstract postOperation<T extends keyof ED>(entity: T, operation: ED[T]['Operation'], context: Context<ED>): Promise<void>;
    abstract checkpoint(context: Context<ED>, timestamp: number): Promise<number>;
}
