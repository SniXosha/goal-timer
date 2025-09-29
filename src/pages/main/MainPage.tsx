import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography
} from "@mui/material"
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
            <Stack direction='column' height='45%' justifyContent='end'
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
            <Box height='10%'>
                <Typography variant="h2">{formatTime(currentMs, true)}</Typography>
            </Box>
            <Box height='45%'>
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

type FormValues = {
    category: string | null;
    name: string | null;
    duration: number; // minutes
};


const GoalCard = () => {
    const {
        accumulatedMs, lastStarted,
        goalDuration, setGoalDuration,
        categoryName, setCategoryName,
        goalName, setGoalName
    } = useTimerStore();

    const [open, setOpen] = useState(false);
    const [formValues, setFormValues] = useState<FormValues>({
        category: categoryName,
        name: goalName,
        duration: goalDuration / 1000 / 60 // minutes
    });

    const handleOpen = () => {
        setFormValues({
            category: categoryName,
            name: goalName,
            duration: goalDuration / 1000 / 60
        });
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleChange =
        (field: keyof FormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = field === "duration" ? Number(e.target.value) : e.target.value;
                setFormValues((prev) => ({...prev, [field]: value}));
            };

    const handleSave = () => {
        setCategoryName(formValues.category);
        setGoalName(formValues.name);
        setGoalDuration(Number(formValues.duration) * 60 * 1000); // back to ms
        setOpen(false);
    };

    return (
        <Stack direction="column" width="20rem">
            <Stack direction="row" alignItems="center" width="20rem">
                <Typography variant="h5" mr="auto">Goal</Typography>
                <IconButton onClick={handleOpen}>
                    <SettingsIcon fontSize="large"/>
                </IconButton>
            </Stack>
            <Paper
                sx={{
                    marginTop: 2,
                    padding: 2,
                    borderRadius: 2,
                }}
            >
                <Grid container>
                    <Grid size={6}>
                        <Typography color='textSecondary'>Category</Typography>
                    </Grid>
                    <Grid size={6}>
                        <Typography>{categoryName}</Typography>
                    </Grid>
                    <Grid size={6}>
                        <Typography color='textSecondary'>Name</Typography>
                    </Grid>
                    <Grid size={6}>
                        <Typography>{goalName}</Typography>
                    </Grid>
                    <Grid size={6}>
                        <Typography color='textSecondary'>Duration</Typography>
                    </Grid>
                    <Grid size={6}>
                        <Typography>
                            {formatTime(goalDuration, false)} (
                            {Math.round(((accumulatedMs + (lastStarted != null ? Date.now() - lastStarted : 0)) / goalDuration) * 10000) / 100}%)
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Dialog open={open} onClose={handleClose} fullWidth={true}>
                <DialogTitle>Edit Goal</DialogTitle>
                <DialogContent>
                    <Stack direction='column' mt={1} spacing={2}>
                        <TextField
                            label="Category"
                            value={formValues.category}
                            onChange={handleChange("category")}
                            fullWidth
                        />
                        <TextField
                            label="Name"
                            value={formValues.name}
                            onChange={handleChange("name")}
                            fullWidth
                        />
                        <TextField
                            label="Duration (minutes)"
                            type="number"
                            value={formValues.duration}
                            onChange={handleChange("duration")}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

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