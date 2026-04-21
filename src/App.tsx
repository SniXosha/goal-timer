import {AppBar, Box, createTheme, IconButton, ThemeProvider, Toolbar, Typography} from "@mui/material";
import MainPage from "./pages/main/MainPage.tsx";
import TimerIcon from '@mui/icons-material/Timer';
import SettingsIcon from '@mui/icons-material/Settings';
import {useState} from "react";
import {useSettingsStore} from "./settings/settingsState.ts";
import {SettingsDialog} from "./settings/SettingsDialog.tsx";
import {ActivityBar} from "./pages/main/ActivityBar.tsx";
import {TimersSidebar} from "./TimersSidebar.tsx";
import {useTimersStore} from "./pages/main/timersState.ts";

function App() {
    const {darkMode, activityBarEnabled, multiTimerEnabled} = useSettingsStore();
    const {timers, activeTimerId} = useTimersStore();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const theme = darkMode ? darkTheme : lightTheme;

    const effectiveTimerId = multiTimerEnabled ? activeTimerId : (timers[0]?.id ?? '');

    return (
        <ThemeProvider theme={theme}>
            <Box
                sx={{
                    height: "100vh",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    backgroundColor: theme.palette.background.default,
                    color: 'text.primary',
                }}
            >
                <AppBar position="static" color="transparent" elevation={0}>
                    <Toolbar>
                        <TimerIcon sx={{mr: 2}}/>
                        <Typography variant="h6" mr="auto">
                            Goal Timer
                        </Typography>
                        <IconButton onClick={() => setSettingsOpen(true)}>
                            <SettingsIcon/>
                        </IconButton>
                        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)}/>
                    </Toolbar>
                </AppBar>
                <Box sx={{flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden'}}>
                    {multiTimerEnabled && <TimersSidebar/>}
                    <Box sx={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                        <Box sx={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {effectiveTimerId && <MainPage key={effectiveTimerId} timerId={effectiveTimerId}/>}
                        </Box>
                        {activityBarEnabled && effectiveTimerId &&
                            <ActivityBar timerId={effectiveTimerId}/>}
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    )
}

const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {main: '#ffcb14'},
        secondary: {main: '#9c27b0'},
        error: {main: '#d32f2f'},
        warning: {main: '#ed6c02'},
        info: {main: '#0288d1'},
        success: {main: '#2e7d32'},
        text: {
            primary: 'rgba(0,0,0,0.87)',
            secondary: 'rgba(0,0,0,0.6)',
            disabled: 'rgba(0,0,0,0.38)',
        },
        background: {
            default: '#fafafa',
            paper: '#dadada',
        },
        divider: 'rgba(0,0,0,0.12)',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                text: {
                    borderColor: "#FFF986",
                    color: "#000000",
                    backgroundColor: "rgba(244,200,0,0.1)",
                    "&:hover": {
                        borderColor: "#FFF986",
                        backgroundColor: "rgba(255, 249, 134, 0.1)"
                    }
                }
            }
        }
    }
});

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {main: '#fff7a0'},
        secondary: {main: '#ce93d8'},
        error: {main: '#f44336'},
        warning: {main: '#ff9800'},
        info: {main: '#2196f3'},
        success: {main: '#4caf50'},
        text: {
            primary: '#fff',
            secondary: 'rgba(255,255,255,0.7)',
            disabled: 'rgba(255,255,255,0.5)',
        },
        background: {
            default: '#121212',
            paper: '#1d1d1d',
        },
        divider: 'rgba(255,255,255,0.12)',
    },
});

export default App
