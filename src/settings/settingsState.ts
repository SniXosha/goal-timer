import {create} from "zustand/react";
import {persist} from "zustand/middleware";

interface SettingsState {
    darkMode: boolean;
    activityBarEnabled: boolean;
    multiTimerEnabled: boolean;
    setDarkMode: (value: boolean) => void;
    setActivityBarEnabled: (value: boolean) => void;
    setMultiTimerEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            darkMode: true,
            activityBarEnabled: false,
            multiTimerEnabled: false,
            setDarkMode: (value) => set({darkMode: value}),
            setActivityBarEnabled: (value) => set({activityBarEnabled: value}),
            setMultiTimerEnabled: (value) => set({multiTimerEnabled: value}),
        }),
        {name: 'settings-storage'}
    )
);
