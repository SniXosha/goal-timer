import {useEffect} from 'react'
import {Box, Button, IconButton, Stack, Typography} from "@mui/material"
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import {GoalCard} from "./GoalCard.tsx";
import {formatTime} from "../../common/timeUtils.ts";
import {useTimersStore} from "./timersState.ts";
import {useNow} from "../../common/useNow.ts";

const BASE_TITLE = 'Goal Timer'

interface Props {
    timerId: string;
}

export default function MainPage({timerId}: Props) {
    const timer = useTimersStore(state => state.timers.find(t => t.id === timerId));
    const {updateTimer, startInterval, closeCurrentInterval, resetActivity} = useTimersStore();

    const accumulatedMs = timer?.accumulatedMs ?? 0;
    const lastStarted = timer?.lastStarted ?? null;
    const goalEnabled = timer?.goalEnabled ?? false;

    const now = useNow(lastStarted === null ? null : 16);
    const currentMs = accumulatedMs + (lastStarted === null ? 0 : Math.max(0, now - lastStarted));

    useEffect(() => {
        if (currentMs > 0) {
            document.title = `${BASE_TITLE} ${formatTime(currentMs, false)}`;
        } else {
            document.title = BASE_TITLE
        }
    }, [currentMs]);

    const handleStart = () => startInterval(timerId, Date.now());
    const handlePause = () => closeCurrentInterval(timerId, Date.now());
    const handleStop = () => resetActivity(timerId);

    if (!timer) return null;

    return (
        <Stack
            direction="column"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{width: '100%', minWidth: 0, px: 2, boxSizing: 'border-box'}}
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
                <Typography variant="h2" sx={{fontSize: {xs: 'clamp(1.5rem, 6vw, 3rem)', md: '3.75rem'}, fontVariantNumeric: 'tabular-nums'}}>{formatTime(currentMs, true)}</Typography>
                <Typography variant="h5" color='textSecondary'>
                    {formatTime(Math.max(0, currentMs - accumulatedMs), true)}
                </Typography>
            </Stack>
            <Box height='40%'>
                <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton aria-label="Start timer" onClick={handleStart}>
                        <PlayCircleIcon fontSize="large"/>
                    </IconButton>
                    <IconButton aria-label="Pause timer" onClick={handlePause}>
                        <PauseCircleIcon fontSize="large"/>
                    </IconButton>
                    <IconButton aria-label="Stop timer" onClick={handleStop}>
                        <StopCircleIcon color="error" fontSize="large"/>
                    </IconButton>
                </Stack>
            </Box>
        </Stack>
    )
}
