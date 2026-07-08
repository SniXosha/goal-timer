import {create} from "zustand/react";
import {persist} from "zustand/middleware";

export interface ActivityInterval {
    start: number;
    end: number | null;
}

export interface TimerEntry {
    id: string;
    name: string;
    accumulatedMs: number;
    lastStarted: number | null;
    goalEnabled: boolean;
    goalDuration: number;
    categoryName: string | null;
    goalName: string | null;
    referenceDay: string | null;
    intervals: ActivityInterval[];
}

interface TimersStore {
    timers: TimerEntry[];
    activeTimerId: string;
    updateTimer: (id: string, patch: Partial<Omit<TimerEntry, 'id'>>) => void;
    createTimer: (day?: string) => void;
    deleteTimer: (id: string) => void;
    setActiveTimerId: (id: string) => void;
    startInterval: (id: string, timestamp: number) => void;
    closeCurrentInterval: (id: string, timestamp: number) => void;
    addInterval: (id: string, day: string) => void;
    updateInterval: (id: string, index: number, interval: ActivityInterval) => void;
    deleteInterval: (id: string, index: number) => void;
    replaceIntervals: (id: string, intervals: ActivityInterval[], referenceDay?: string) => void;
    resetActivity: (id: string) => void;
}

function localDateStr(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function localDayStart(dayStr: string): number {
    const [y, m, d] = dayStr.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
}

function normalizeIntervals(intervals: ActivityInterval[]): ActivityInterval[] {
    return [...intervals]
        .map(iv => ({
            start: Math.max(0, iv.start),
            end: iv.end === null ? null : Math.max(0, iv.end),
        }))
        .map(iv => iv.end !== null && iv.end < iv.start ? {...iv, end: iv.start} : iv)
        .sort((a, b) => a.start - b.start);
}

function accumulatedFromIntervals(intervals: ActivityInterval[]): number {
    return intervals.reduce((total, iv) => {
        if (iv.end === null) return total;
        return total + Math.max(0, iv.end - iv.start);
    }, 0);
}

function withRecalculatedActivity(timer: TimerEntry, intervals: ActivityInterval[]): TimerEntry {
    const normalized = normalizeIntervals(intervals);
    return {
        ...timer,
        accumulatedMs: accumulatedFromIntervals(normalized),
        referenceDay: normalized.length > 0 ? localDateStr(normalized[0].start) : null,
        intervals: normalized,
    };
}

function timerBelongsToDay(timer: TimerEntry, day: string): boolean {
    return timer.referenceDay === day || timer.intervals.some(interval => localDateStr(interval.start) === day);
}

function timerNameForDay(timers: TimerEntry[], day?: string): string {
    const count = day
        ? timers.filter(timer => timerBelongsToDay(timer, day)).length
        : timers.filter(timer => timer.intervals.length === 0 && timer.referenceDay === null).length;
    return count === 0 ? 'Timer' : `Timer ${count + 1}`;
}

function makeTimer(name: string, overrides: Partial<Omit<TimerEntry, 'id' | 'name'>> = {}): TimerEntry {
    return {
        id: crypto.randomUUID(),
        name,
        accumulatedMs: 0,
        lastStarted: null,
        goalEnabled: false,
        goalDuration: 5.75 * 60 * 60 * 1000,
        categoryName: null,
        goalName: null,
        referenceDay: null,
        intervals: [],
        ...overrides,
    };
}

function getInitialState(): {timers: TimerEntry[]; activeTimerId: string} {
    const oldTimerRaw = localStorage.getItem('timer-storage');
    const oldActivityRaw = localStorage.getItem('activity-storage');
    let timer: TimerEntry;
    if (oldTimerRaw) {
        try {
            const oldTimer = JSON.parse(oldTimerRaw).state ?? {};
            const oldActivity = oldActivityRaw ? (JSON.parse(oldActivityRaw).state ?? {}) : {};
            timer = makeTimer('Timer 1', {
                accumulatedMs: oldTimer.accumulatedMs ?? 0,
                lastStarted: oldTimer.lastStarted ?? null,
                goalEnabled: oldTimer.goalEnabled ?? false,
                goalDuration: oldTimer.goalDuration ?? 5.75 * 60 * 60 * 1000,
                categoryName: oldTimer.categoryName ?? null,
                goalName: oldTimer.goalName ?? null,
                referenceDay: oldActivity.referenceDay ?? null,
                intervals: oldActivity.intervals ?? [],
            });
        } catch {
            timer = makeTimer('Timer 1');
        }
    } else {
        timer = makeTimer('Timer 1');
    }
    return {timers: [timer], activeTimerId: timer.id};
}

const initial = getInitialState();

export const useTimersStore = create<TimersStore>()(
    persist(
        (set, get) => ({
            ...initial,

            updateTimer: (id, patch) => set(state => ({
                timers: state.timers.map(t => t.id === id ? {...t, ...patch} : t),
            })),

            createTimer: (day) => {
                const dayStart = day ? localDayStart(day) : null;
                const timer = makeTimer(timerNameForDay(get().timers, day), dayStart === null ? {} : {
                    referenceDay: day,
                    intervals: [{start: dayStart, end: dayStart}],
                });
                set(state => ({
                    timers: [...state.timers, timer],
                    activeTimerId: timer.id,
                }));
            },

            deleteTimer: (id) => set(state => {
                const remaining = state.timers.filter(t => t.id !== id);
                const newActiveId = state.activeTimerId === id ? remaining[0].id : state.activeTimerId;
                return {timers: remaining, activeTimerId: newActiveId};
            }),

            setActiveTimerId: (id) => set({activeTimerId: id}),

            startInterval: (id, timestamp) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    return {
                        ...t,
                        referenceDay: t.referenceDay ?? localDateStr(timestamp),
                        intervals: [...t.intervals, {start: timestamp, end: null}],
                    };
                }),
            })),

            closeCurrentInterval: (id, timestamp) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    const last = t.intervals[t.intervals.length - 1];
                    if (!last || last.end !== null) return t;
                    return withRecalculatedActivity(t, t.intervals.map((iv, i) =>
                        i === t.intervals.length - 1 ? {...iv, end: timestamp} : iv
                    ));
                }),
            })),

            addInterval: (id, day) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    const start = localDayStart(day) + 9 * 60 * 60 * 1000;
                    return withRecalculatedActivity(t, [...t.intervals, {start, end: start + 60 * 60 * 1000}]);
                }),
            })),

            updateInterval: (id, index, interval) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    return withRecalculatedActivity(t, t.intervals.map((iv, i) => i === index ? interval : iv));
                }),
            })),

            deleteInterval: (id, index) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    return withRecalculatedActivity(t, t.intervals.filter((_, i) => i !== index));
                }),
            })),

            replaceIntervals: (id, intervals, referenceDay) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    return {...withRecalculatedActivity(t, intervals), referenceDay: referenceDay ?? t.referenceDay};
                }),
            })),

            resetActivity: (id) => set(state => ({
                timers: state.timers.map(t =>
                    t.id === id ? {...t, referenceDay: null, intervals: []} : t
                ),
            })),
        }),
        {name: 'timers-storage'}
    )
);
