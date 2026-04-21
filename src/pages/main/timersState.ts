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
    createTimer: () => void;
    deleteTimer: (id: string) => void;
    setActiveTimerId: (id: string) => void;
    startInterval: (id: string, timestamp: number) => void;
    closeCurrentInterval: (id: string, timestamp: number) => void;
    resetActivity: (id: string) => void;
}

function localDateStr(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

            createTimer: () => {
                const timer = makeTimer(`Timer ${get().timers.length + 1}`);
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
                    return {
                        ...t,
                        intervals: t.intervals.map((iv, i) =>
                            i === t.intervals.length - 1 ? {...iv, end: timestamp} : iv
                        ),
                    };
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
