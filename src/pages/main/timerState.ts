import {create} from "zustand/react";
import {persist} from "zustand/middleware";

interface TimerState {
    accumulatedMs: number;
    lastStarted: number | null;
    goalEnabled: boolean;
    goalDuration: number;
    categoryName: string | null;
    goalName: string | null;
    setAccumulatedMs: (value: number) => void;
    setLastStarted: (value: number | null) => void;
    setGoalEnabled: (value: boolean) => void;
    setGoalDuration: (value: number) => void;
    setCategoryName: (value: string | null) => void;
    setGoalName: (value: string | null) => void;
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set) => ({
            accumulatedMs: 0,
            lastStarted: null,
            goalEnabled: false,
            goalDuration: 5.75 * 60 * 60 * 1000,
            categoryName: null,
            goalName: null,
            setAccumulatedMs: (value) => set({accumulatedMs: value}),
            setLastStarted: (value) => set({lastStarted: value}),
            setGoalEnabled: (value) => set({goalEnabled: value}),
            setGoalDuration: (value) => set({goalDuration: value}),
            setCategoryName: (value) => set({categoryName: value}),
            setGoalName: (value) => set({goalName: value}),
        }),
        {
            name: 'timer-storage',
        }
    )
);