import type {TimerEntry} from '../pages/main/timersState.ts';
import {addDays, localDateStr, localDayStart} from './dateUtils.ts';

export function timerDuration(timer: TimerEntry, now: number): number {
    return timer.accumulatedMs + (timer.lastStarted === null ? 0 : Math.max(0, now - timer.lastStarted));
}

export function dailyTotals(timers: TimerEntry[], startDay: string, endDay: string, now: number) {
    const totals = new Map<string, number>();
    for (const timer of timers) {
        if (timer.referenceDay) totals.set(timer.referenceDay, (totals.get(timer.referenceDay) ?? 0) + timerDuration(timer, now));
    }
    const result: {day: string; ms: number}[] = [];
    for (let day = startDay; day <= endDay; day = addDays(day, 1)) {
        result.push({day, ms: totals.get(day) ?? 0});
    }
    return result;
}

// The histogram averages actual wall-clock hours across days with recorded activity,
// independently of daily attribution. Every bin includes every active day's contribution,
// even when that day's contribution to the bin is zero.
// Walking elapsed hours also preserves both instances of a repeated DST hour.
export function hourlyDistribution(timers: TimerEntry[], startDay: string, endDay: string, now: number): number[] {
    const bins = Array<number>(24).fill(0);
    const activeDays = new Set<string>();
    const rangeStart = localDayStart(startDay);
    const rangeEnd = Math.min(localDayStart(addDays(endDay, 1)), now);
    for (const timer of timers) {
        for (const interval of timer.intervals) {
            let cursor = Math.max(interval.start, rangeStart);
            const end = Math.min(interval.end ?? now, rangeEnd);
            while (cursor < end) {
                const date = new Date(cursor);
                const nextHour = cursor + (60 - date.getMinutes()) * 60000 - date.getSeconds() * 1000 - date.getMilliseconds();
                const segmentEnd = Math.min(end, nextHour);
                bins[date.getHours()] += segmentEnd - cursor;
                activeDays.add(localDateStr(cursor));
                cursor = segmentEnd;
            }
        }
    }
    return bins.map(ms => ms / Math.max(1, activeDays.size));
}
