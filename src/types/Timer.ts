import { RecurrenceRule, RecurrenceSpecDateRange, RecurrenceSpecObjLit } from 'node-schedule';
import { EntityDict } from './Entity';
import { AsyncContext } from '../store/AsyncRowStore';
import { Watcher } from './Watcher';
import { OperationResult } from '.';

type FreeOperateFn<ED extends EntityDict, Cxt extends AsyncContext<ED>> = (
    context: Cxt
) => Promise<OperationResult<ED>>;

export type FreeRoutine<ED extends EntityDict, Cxt extends AsyncContext<ED>> = {
    name: string;
    routine: FreeOperateFn<ED, Cxt>;
};

export type FreeTimer<ED extends EntityDict, Cxt extends AsyncContext<ED>> = {
    name: string;
    cron: RecurrenceRule | RecurrenceSpecDateRange | RecurrenceSpecObjLit | Date | string | number;
    timer: FreeOperateFn<ED, Cxt>;
};

export type Routine<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> = FreeRoutine<ED, Cxt> | Watcher<ED, T, Cxt>;
export type Timer<ED extends EntityDict, T extends keyof ED, Cxt extends AsyncContext<ED>> = FreeTimer<ED, Cxt> | Watcher<ED, T, Cxt> & { 
    cron: RecurrenceRule | RecurrenceSpecDateRange | RecurrenceSpecObjLit | Date | string | number;
};
