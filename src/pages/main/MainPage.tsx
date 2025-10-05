import {useEffect, useRef, useState} from 'react'
import {Box, Button, IconButton, Stack, Typography} from "@mui/material"
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import {GoalCard} from "./GoalCard.tsx";
import {formatTime} from "../../common/timeUtils.ts";
import {useTimerStore} from "./timerState.ts";

const BASE_TITLE = 'Goal Timer'

export default function MainPage() {
    const {
        accumulatedMs,
        lastStarted,
        goalEnabled,
        setAccumulatedMs,
        setLastStarted,
        setGoalEnabled
    } = useTimerStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [currentMs, setCurrentMs] = useState<number>(
        accumulatedMs + (lastStarted != null ? Date.now() - lastStarted : 0)
    )

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
            setLastStarted(Date.now())
        }
    }

    const handlePause = () => {
        if (lastStarted !== null) {
            setAccumulatedMs(accumulatedMs + (Date.now() - lastStarted))
            setLastStarted(null)
        }
    }

    const handleStop = () => {
        setAccumulatedMs(0)
        setLastStarted(null)
        setCurrentMs(0)
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
            <Stack direction='column' height='40%' justifyContent='end'
                   spacing={2}>
                {goalEnabled && <GoalCard/>}
                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Button variant='contained' size='small'
                            onClick={() => setGoalEnabled(!goalEnabled)}
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