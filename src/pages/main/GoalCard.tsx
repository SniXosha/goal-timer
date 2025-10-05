import {
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
} from "@mui/material";
import * as React from "react";
import {useState} from "react";
import {formatTime} from "../../common/timeUtils.ts";
import SettingsIcon from '@mui/icons-material/Settings';
import {useTimerStore} from "./timerState.ts";


type FormValues = {
    category: string | null;
    name: string | null;
    duration: number; // minutes
};

export const GoalCard = () => {
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