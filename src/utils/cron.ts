import { getFutureMatches } from '@datasert/cronjs-matcher';
import DayJs from 'dayjs';

export function schedule(cron: string, fn: (date: Date) => any) {
    const futureMatches = getFutureMatches(cron, {
        matchCount: 1,
    });
    const date = DayJs(futureMatches[0]);
    const interval = date.diff(DayJs(), 'ms');
    setTimeout(
        () => {
            fn(new Date());
            schedule(cron, fn);
        },
        interval
    );
}
