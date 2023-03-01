import { RecurrenceRule, RecurrenceSpecDateRange, RecurrenceSpecObjLit } from 'node-schedule';
import { EntityDict } from './Entity';
import { AsyncContext } from '../store/AsyncRowStore';
declare type RoutineFn<ED extends EntityDict, Cxt extends AsyncContext<ED>> = (context: Cxt) => Promise<string>;
export declare type Routine<ED extends EntityDict, Cxt extends AsyncContext<ED>> = {
    name: string;
    fn: RoutineFn<ED, Cxt>;
};
export declare type Timer<ED extends EntityDict, Cxt extends AsyncContext<ED>> = {
    name: string;
    cron: RecurrenceRule | RecurrenceSpecDateRange | RecurrenceSpecObjLit | Date | string | number;
    fn: RoutineFn<ED, Cxt>;
};
export {};
