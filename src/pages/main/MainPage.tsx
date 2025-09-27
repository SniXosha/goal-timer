import {useEffect, useRef} from 'react'
import {Box, Button, Grid, IconButton, Stack, Typography} from "@mui/material"
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import {persist} from "zustand/middleware";
import {create} from "zustand/react";
import SettingsIcon from '@mui/icons-material/Settings';

interface TimerState {
    accumulatedMs: number;
    currentMs: number;
    lastStarted: number | null;
    goalEnabled: boolean;
    goalDuration: number;
    categoryName: string | null;
    goalName: string | null;
    setAccumulatedMs: (value: number) => void;
    setCurrentMs: (value: number) => void;
    setLastStarted: (value: number | null) => void;
    setGoalEnabled: (value: boolean) => void;
    setGoalDuration: (value: number) => void;
    setCategoryName: (value: string | null) => void;
    setGoalName: (value: string | null) => void;
}

const useTimerStore = create<TimerState>()(
    persist(
        (set) => ({
            accumulatedMs: 0,
            currentMs: 0,
            lastStarted: null,
            goalEnabled: false,
            goalDuration: 5.75 * 60 * 60 * 1000,
            categoryName: null,
            goalName: null,
            setAccumulatedMs: (value) => set({accumulatedMs: value}),
            setCurrentMs: (value) => set({currentMs: value}),
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

export default function MainPage() {
    const {
        accumulatedMs,
        currentMs,
        lastStarted,
        goalEnabled,
        setAccumulatedMs,
        setCurrentMs,
        setLastStarted,
        setGoalEnabled
    } = useTimerStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (lastStarted !== null) {
            intervalRef.current = setInterval(() => {
                setCurrentMs(accumulatedMs + (Date.now() - lastStarted))
            }, 16) // ~60fps
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [lastStarted])

    const handleStart = () => {
        if (lastStarted === null) {
            setLastStarted(Date.now())
        }
    }

    const handlePause = () => {
        if (lastStarted !== null) {
            // accumulatedRef.current += Date.now() - lastStarted
            setAccumulatedMs(accumulatedMs + (Date.now() - lastStarted))
            setLastStarted(null)
        }
    }

    const handleStop = () => {
        // accumulatedRef.current = 0
        setAccumulatedMs(0)
        setLastStarted(null)
    }

    return (
        <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            width='50%'
            height='100%'
        >
            <Stack direction='column' height='45%' justifyContent='end'
                   spacing={2}>
                {goalEnabled && <GoalCard/>}
                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Button variant='contained' sx={{backgroundColor: '#444444'}} size='small'
                            onClick={() => setGoalEnabled(!goalEnabled)}
                    >{goalEnabled ? 'Remove goal' : 'Add goal'}</Button>
                    <Button variant='contained' sx={{backgroundColor: '#444444'}} size='small'>Enable splits</Button>
                </Stack>
            </Stack>
            <Box height='10%'>
                <Typography variant="h2">{formatTime(currentMs, true)}</Typography>
            </Box>
            <Box height='45%'>
                <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton onClick={handleStart}>
                        <PlayCircleIcon sx={{color: "white"}} fontSize="large"/>
                    </IconButton>
                    <IconButton onClick={handlePause}>
                        <PauseCircleIcon sx={{color: "white"}} fontSize="large"/>
                    </IconButton>
                    <IconButton onClick={handleStop}>
                        <StopCircleIcon color="error" fontSize="large"/>
                    </IconButton>
                </Stack>
            </Box>
        </Stack>
    )
}

const GoalCard = () => {
    const {
        accumulatedMs,
        goalDuration, setGoalDuration,
        categoryName, setCategoryName,
        goalName, setGoalName
    } = useTimerStore();

    return <Stack direction='column' width='20rem'>
        <Stack direction='row' alignItems='center' width='20rem'>
            <Typography variant='h5' mr='auto'>Goal</Typography>
            <IconButton>
                <SettingsIcon sx={{color: "white"}} fontSize="large"/>
            </IconButton>
        </Stack>
        <Box marginTop={2} padding={2}
             borderRadius={2}
             sx={{backgroundColor: '#333333'}}
        >
            <Grid container>
                <Grid size={6}>
                    <Typography sx={{color: '#FFF986'}}>Category</Typography>
                </Grid>
                <Grid size={6}>
                    <Typography>Working time</Typography>
                </Grid>
                <Grid size={6}>
                    <Typography sx={{color: '#FFF986'}}>Name</Typography>
                </Grid>
                <Grid size={6}>
                    <Typography>Day 28.09</Typography>
                </Grid>
                <Grid size={6}>
                    <Typography sx={{color: '#FFF986'}}>Duration</Typography>
                </Grid>
                <Grid size={6}>
                    <Typography>
                        {formatTime(goalDuration, false)} ({Math.round(accumulatedMs / goalDuration * 10000) / 100}%)
                    </Typography>
                </Grid>
            </Grid>
        </Box>
    </Stack>;
}

function formatTime(ms: number, withMs: boolean) {
    const totalSec = Math.floor(ms / 1000)
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0")
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")
    const s = String(totalSec % 60).padStart(2, "0")
    if (!withMs) {
        return `${h}:${m}:${s}`
    }
    const mss = String(ms % 1000).padStart(3, "0")
    return `${h}:${m}:${s}.${mss}`
}

function parseTime(str: string): number | null {
    // Matches HH:MM:SS or HH:MM:SS.mmm
    const match = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(str);
    if (!match) return null;

    const [, hh, mm, ss, ms] = match;
    const h = Number(hh);
    const m = Number(mm);
    const s = Number(ss);
    const milli = ms ? Number(ms.padEnd(3, '0')) : 0; // pad milliseconds to 3 digits

    // Basic validation
    if (m >= 60 || s >= 60 || h < 0 || m < 0 || s < 0 || milli < 0 || milli > 999) return null;

    return h * 3600_000 + m * 60_000 + s * 1000 + milli;
}