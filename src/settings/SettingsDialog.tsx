import {Dialog, DialogTitle, DialogContent, FormControlLabel, Switch, Stack} from "@mui/material";
import {useSettingsStore} from "./settingsState.ts";

interface Props {
    open: boolean;
    onClose: () => void;
}

export const SettingsDialog = ({open, onClose}: Props) => {
    const {darkMode, setDarkMode, activityBarEnabled, setActivityBarEnabled, multiTimerEnabled, setMultiTimerEnabled} = useSettingsStore();

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <Stack direction="column">
                    <FormControlLabel
                        control={<Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>}
                        label="Dark mode"
                    />
                    <FormControlLabel
                        control={<Switch checked={activityBarEnabled} onChange={(e) => setActivityBarEnabled(e.target.checked)}/>}
                        label="Daily activity bar"
                    />
                    <FormControlLabel
                        control={<Switch checked={multiTimerEnabled} onChange={(e) => setMultiTimerEnabled(e.target.checked)}/>}
                        label="Multiple timers"
                    />
                </Stack>
            </DialogContent>
        </Dialog>
    );
};
