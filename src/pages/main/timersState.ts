import {create} from "zustand/react";
import {persist} from "zustand/middleware";
import {localDateStr, localDayStart} from "../../common/dateUtils.ts";
import {timerDuration} from "../../common/timerStats.ts";
export {localDayStart} from "../../common/dateUtils.ts";

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
    updateTimer: (id: string, patch: Partial<Omit<TimerEntry, 'id' | 'referenceDay'>>) => void;
    createTimer: (day?: string) => void;
    selectDay: (day: string) => void;
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
        lastStarted: normalized.find(iv => iv.end === null)?.start ?? null,
        intervals: normalized,
    };
}

function timerBelongsToDay(timer: TimerEntry, day: string): boolean {
    return timer.referenceDay === day;
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
        referenceDay: localDateStr(Date.now()),
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

// Older calendars changed referenceDay during selection. Recover the original
// day from the first recorded start (including the old creation placeholder).
export function migrateTimer(timer: TimerEntry): TimerEntry {
    const starts = timer.intervals.map(iv => iv.start);
    if (timer.lastStarted !== null) starts.push(timer.lastStarted);
    const referenceDay = starts.length ? localDateStr(Math.min(...starts)) : timer.referenceDay ?? localDateStr(Date.now());
    const intervals = [...timer.intervals];
    if (timer.lastStarted !== null && !intervals.some(iv => iv.end === null)) {
        intervals.push({start: timer.lastStarted, end: null});
    }
    return {...timer, referenceDay, intervals};
}

const initialState = getInitialState();
const initial = {...initialState, timers: initialState.timers.map(migrateTimer)};

export const useTimersStore = create<TimersStore>()(
    persist(
        (set, get) => ({
            ...initial,

            updateTimer: (id, patch) => set(state => ({
                timers: state.timers.map(t => t.id === id ? {...t, ...patch, referenceDay: t.referenceDay} : t),
            })),

            createTimer: (day = localDateStr(Date.now())) => {
                if (localDayStart(day) > Date.now()) return;
                const timer = makeTimer(timerNameForDay(get().timers, day), {referenceDay: day});
                set(state => ({timers: [...state.timers, timer], activeTimerId: timer.id}));
            },

            selectDay: (day) => {
                if (localDayStart(day) > Date.now()) return;
                const state = get();
                const existing = state.timers.filter(timer => timerBelongsToDay(timer, day));
                const selected = existing.find(timer => timer.id === state.activeTimerId)
                    ?? existing.sort((a, b) => timerDuration(b, Date.now()) - timerDuration(a, Date.now()))[0];
                if (selected) set({activeTimerId: selected.id});
                else state.createTimer(day);
            },

            deleteTimer: (id) => set(state => {
                if (state.timers.length <= 1) return state;
                const remaining = state.timers.filter(t => t.id !== id);
                const newActiveId = state.activeTimerId === id ? remaining[0].id : state.activeTimerId;
                return {timers: remaining, activeTimerId: newActiveId};
            }),

            setActiveTimerId: (id) => set({activeTimerId: id}),

            startInterval: (id, timestamp) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id || t.lastStarted !== null) return t;
                    return {
                        ...t,
                        lastStarted: timestamp,
                        intervals: [...t.intervals, {start: timestamp, end: null}],
                    };
                }),
            })),

            closeCurrentInterval: (id, timestamp) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    if (t.lastStarted === null) return t;
                    return {
                        ...t,
                        accumulatedMs: t.accumulatedMs + Math.max(0, timestamp - t.lastStarted),
                        lastStarted: null,
                        intervals: t.intervals.map(iv => iv.end === null ? {...iv, end: Math.max(iv.start, timestamp)} : iv),
                    };
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

            replaceIntervals: (id, intervals) => set(state => ({
                timers: state.timers.map(t => {
                    if (t.id !== id) return t;
                    return withRecalculatedActivity(t, intervals);
                }),
            })),

            resetActivity: (id) => set(state => ({
                timers: state.timers.map(t =>
                    t.id === id ? {...t, accumulatedMs: 0, lastStarted: null, intervals: []} : t
                ),
            })),
        }),
        {
            name: 'timers-storage',
            version: 1,
            migrate: persisted => {
                const state = persisted as {timers: TimerEntry[]; activeTimerId: string};
                return {...state, timers: state.timers.map(migrateTimer)};
            },
        }
    )
);
