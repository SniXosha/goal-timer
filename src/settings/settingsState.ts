import {create} from "zustand/react";
import {persist} from "zustand/middleware";

interface SettingsState {
    darkMode: boolean;
    activityBarEnabled: boolean;
    setDarkMode: (value: boolean) => void;
    setActivityBarEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            darkMode: true,
            activityBarEnabled: false,
            setDarkMode: (value) => set({darkMode: value}),
            setActivityBarEnabled: (value) => set({activityBarEnabled: value}),
        }),
        {name: 'settings-storage'}
    )
);
