import {useEffect, useRef, useState} from 'react'
import {Box, Button, IconButton, Stack, Typography} from "@mui/material"
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import {GoalCard} from "./GoalCard.tsx";
import {formatTime} from "../../common/timeUtils.ts";
import {useTimersStore} from "./timersState.ts";
import {useSettingsStore} from "../../settings/settingsState.ts";

const BASE_TITLE = 'Goal Timer'

interface Props {
    timerId: string;
}

export default function MainPage({timerId}: Props) {
    const timer = useTimersStore(state => state.timers.find(t => t.id === timerId));
    const {updateTimer, startInterval, closeCurrentInterval, resetActivity} = useTimersStore();
    const {activityBarEnabled} = useSettingsStore();

    const accumulatedMs = timer?.accumulatedMs ?? 0;
    const lastStarted = timer?.lastStarted ?? null;
    const goalEnabled = timer?.goalEnabled ?? false;

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [currentMs, setCurrentMs] = useState<number>(
        accumulatedMs + (lastStarted != null ? Date.now() - lastStarted : 0)
    )

    // Handle activityBarEnabled toggled while timer is already running
    const prevActivityBarEnabledRef = useRef(activityBarEnabled);
    useEffect(() => {
        const wasEnabled = prevActivityBarEnabledRef.current;
        prevActivityBarEnabledRef.current = activityBarEnabled;
        if (wasEnabled === activityBarEnabled) return;
        if (activityBarEnabled && lastStarted !== null) {
            startInterval(timerId, Date.now());
        } else if (!activityBarEnabled) {
            closeCurrentInterval(timerId, Date.now());
        }
    // lastStarted intentionally omitted — we only react to activityBarEnabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityBarEnabled]);

    useEffect(() => {
        if (lastStarted !== null) {
            intervalRef.current = setInterval(() => {
                setCurrentMs(accumulatedMs + (Date.now() - lastStarted))
            }, 16) // ~60fps
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [accumulatedMs, lastStarted])

    useEffect(() => {
        if (currentMs > 0) {
            document.title = `${BASE_TITLE} ${formatTime(currentMs, false)}`;
        } else {
            document.title = BASE_TITLE
        }
    }, [currentMs]);

    const handleStart = () => {
        if (lastStarted === null) {
            const now = Date.now();
            updateTimer(timerId, {lastStarted: now});
            if (activityBarEnabled) startInterval(timerId, now);
        }
    }

    const handlePause = () => {
        if (lastStarted !== null) {
            const now = Date.now();
            updateTimer(timerId, {
                accumulatedMs: accumulatedMs + (now - lastStarted),
                lastStarted: null,
            });
            if (activityBarEnabled) closeCurrentInterval(timerId, now);
        }
    }

    const handleStop = () => {
        const now = Date.now();
        if (activityBarEnabled) closeCurrentInterval(timerId, now);
        updateTimer(timerId, {accumulatedMs: 0, lastStarted: null});
        setCurrentMs(0);
        if (activityBarEnabled) resetActivity(timerId);
    }

    if (!timer) return null;

    return (
        <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            width='50%'
            height='100%'
        >
            <Stack direction='column' height='40%' justifyContent='end'
                   spacing={2}>
                {goalEnabled && <GoalCard timerId={timerId}/>}
                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Button variant='contained' size='small'
                            onClick={() => updateTimer(timerId, {goalEnabled: !goalEnabled})}
                    >{goalEnabled ? 'Remove goal' : 'Add goal'}</Button>
                    <Button variant='contained' size='small'>Enable splits</Button>
                </Stack>
            </Stack>
            <Stack direction='column' justifyContent='center' alignItems="center" spacing={2}>
                <Typography variant="h2">{formatTime(currentMs, true)}</Typography>
                <Typography variant="h5" color='textSecondary'>
                    {formatTime(Math.max(0, currentMs - accumulatedMs), true)}
                </Typography>
            </Stack>
            <Box height='40%'>
                <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton onClick={handleStart}>
                        <PlayCircleIcon fontSize="large"/>
                    </IconButton>
                    <IconButton onClick={handlePause}>
                        <PauseCircleIcon fontSize="large"/>
                    </IconButton>
                    <IconButton onClick={handleStop}>
                        <StopCircleIcon color="error" fontSize="large"/>
                    </IconButton>
                </Stack>
            </Box>
        </Stack>
    )
}
