import {create} from "zustand/react";
import {persist} from "zustand/middleware";

export interface ActivityInterval {
    start: number;
    end: number | null;
}

interface ActivityState {
    referenceDay: string | null;
    intervals: ActivityInterval[];
    startInterval: (timestamp: number) => void;
    closeCurrentInterval: (timestamp: number) => void;
    resetActivity: () => void;
}

function localDateStr(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export const useActivityStore = create<ActivityState>()(
    persist(
        (set, get) => ({
            referenceDay: null,
            intervals: [],
            startInterval: (timestamp) => {
                const {referenceDay, intervals} = get();
                set({
                    referenceDay: referenceDay ?? localDateStr(timestamp),
                    intervals: [...intervals, {start: timestamp, end: null}],
                });
            },
            closeCurrentInterval: (timestamp) => {
                const {intervals} = get();
                const last = intervals[intervals.length - 1];
                if (!last || last.end !== null) return;
                set({
                    intervals: intervals.map((iv, i) =>
                        i === intervals.length - 1 ? {...iv, end: timestamp} : iv
                    ),
                });
            },
            resetActivity: () => set({referenceDay: null, intervals: []}),
        }),
        {name: 'activity-storage'}
    )
);
