import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {type ActivityInterval, localDayStart, useTimersStore} from "./timersState.ts";
import {useEffect, useMemo, useState} from "react";
import {formatTime} from "../../common/timeUtils.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

interface DraftSegment {
    start: string;
    end: string;
}

function localDateStr(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toTimeInput(timestamp: number): string {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
}

function parseTime(dayStart: number, value: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return dayStart + hours * 60 * MINUTE_MS + minutes * MINUTE_MS;
}

function segmentTouchesDay(interval: ActivityInterval, dayStart: number): boolean {
    const dayEnd = dayStart + DAY_MS;
    const end = interval.end ?? Date.now();
    return interval.start < dayEnd && end > dayStart;
}

function segmentStartsOnDay(interval: ActivityInterval, day: string): boolean {
    return localDateStr(interval.start) === day;
}

function validateDrafts(drafts: DraftSegment[], dayStart: number, now: number): string | null {
    const parsed = drafts.map((draft, index) => {
        const start = parseTime(dayStart, draft.start);
        const end = parseTime(dayStart, draft.end);
        if (start === null || end === null) return {index, start: 0, end: 0, error: 'Use valid 24h time values.'};
        if (end < start) return {index, start, end, error: 'End time cannot be before start time.'};
        if (start > now || end > now) return {index, start, end, error: 'Segments cannot exceed the current time.'};
        return {index, start, end, error: null};
    });

    const invalid = parsed.find(item => item.error !== null);
    if (invalid?.error) return `Row ${invalid.index + 1}: ${invalid.error}`;

    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i - 1].end > sorted[i].start) {
            return `Rows ${sorted[i - 1].index + 1} and ${sorted[i].index + 1} intersect.`;
        }
    }

    return null;
}

interface Props {
    timerId: string;
}

export const ActivityBar = ({timerId}: Props) => {
    const timer = useTimersStore(state => state.timers.find(t => t.id === timerId));
    const replaceIntervals = useTimersStore(state => state.replaceIntervals);
    const referenceDay = timer?.referenceDay ?? null;
    const intervals = useMemo(() => timer?.intervals ?? [], [timer?.intervals]);

    const [now, setNow] = useState(Date.now());
    const [editorOpen, setEditorOpen] = useState(false);
    const [drafts, setDrafts] = useState<DraftSegment[]>([]);
    const hasOpenInterval = intervals.some(iv => iv.end === null);

    useEffect(() => {
        if (!hasOpenInterval && !editorOpen) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [hasOpenInterval, editorOpen]);

    const visibleDay = referenceDay ?? localDateStr(now);
    const dayStart = localDayStart(visibleDay);
    const dayEnd = dayStart + DAY_MS;
    const dayIntervals = intervals.filter(iv => segmentTouchesDay(iv, dayStart));
    const validationMessage = editorOpen ? validateDrafts(drafts, dayStart, now) : null;

    const toPercent = (ms: number): number => ((ms - dayStart) / DAY_MS) * 100;

    const openEditor = () => {
        setDrafts(
            intervals
                .filter(iv => segmentStartsOnDay(iv, visibleDay))
                .sort((a, b) => a.start - b.start)
                .map(iv => ({start: toTimeInput(iv.start), end: toTimeInput(iv.end ?? now)}))
        );
        setEditorOpen(true);
    };

    const handleDraftChange = (index: number, patch: Partial<DraftSegment>) => {
        setDrafts(current => current.map((draft, i) => i === index ? {...draft, ...patch} : draft));
    };

    const handleAddDraft = () => {
        const start = Math.min(Math.max(dayStart + 9 * 60 * MINUTE_MS, dayStart), Math.min(now, dayEnd - MINUTE_MS));
        const end = Math.min(start + 60 * MINUTE_MS, now, dayEnd - MINUTE_MS);
        setDrafts(current => [...current, {start: toTimeInput(start), end: toTimeInput(Math.max(start, end))}]);
    };

    const handleDeleteDraft = (index: number) => {
        setDrafts(current => current.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!timer || validationMessage) return;
        const otherIntervals = intervals.filter(iv => !segmentStartsOnDay(iv, visibleDay));
        const editedIntervals = drafts.map(draft => ({
            start: parseTime(dayStart, draft.start) ?? dayStart,
            end: parseTime(dayStart, draft.end) ?? dayStart,
        }));
        replaceIntervals(timerId, [...otherIntervals, ...editedIntervals], visibleDay);
        setEditorOpen(false);
    };

    return (
        <Box sx={{width: '100%', px: 4, pb: 2, pt: 1, boxSizing: 'border-box'}}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{mr: 'auto'}}>
                    {dayIntervals.length ? `Activity - ${visibleDay}` : 'Activity - no segments recorded'}
                </Typography>
                <Button size="small" startIcon={<EditIcon/>} onClick={openEditor}>Edit history</Button>
            </Stack>
            <Box sx={{position: 'relative', width: '100%'}}>
                <Box sx={{
                    width: '100%',
                    height: 8,
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {dayIntervals.map((iv, i) => {
                        const start = Math.max(iv.start, dayStart);
                        const end = Math.min(iv.end ?? now, dayEnd);
                        if (start >= dayEnd || end <= dayStart) return null;
                        const left = toPercent(start);
                        const width = toPercent(end) - left;
                        return (
                            <Box key={i} sx={{
                                position: 'absolute',
                                left: `${left}%`,
                                width: `${width}%`,
                                height: '100%',
                                backgroundColor: 'primary.main',
                                minWidth: '2px',
                            }}/>
                        );
                    })}
                </Box>
                <Box sx={{position: 'relative', width: '100%', height: 20, mt: 0.5}}>
                    {Array.from({length: 25}, (_, h) => {
                        const isMajor = h % 3 === 0;
                        const showLabel = isMajor && h < 24;
                        const positionSx = h === 0
                            ? {left: 0, alignItems: 'flex-start' as const}
                            : h === 24
                            ? {right: 0, alignItems: 'flex-end' as const}
                            : {left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)', alignItems: 'center' as const};
                        return (
                            <Box key={h} sx={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                ...positionSx,
                            }}>
                                <Box sx={{width: '1px', height: isMajor ? 6 : 3, backgroundColor: 'text.disabled'}}/>
                                {showLabel && (
                                    <Typography variant="caption" color="textSecondary" sx={{fontSize: '0.6rem', lineHeight: 1}}>
                                        {h}
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Timer segments</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} pt={0.5}>
                        {drafts.length === 0 && (
                            <Typography variant="body2" color="textSecondary">No segments for this day.</Typography>
                        )}
                        {drafts.map((draft, index) => {
                            const start = parseTime(dayStart, draft.start);
                            const end = parseTime(dayStart, draft.end);
                            const duration = start !== null && end !== null ? Math.max(0, end - start) : 0;
                            return (
                                <Box key={index} sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '112px 112px 78px 32px',
                                    gap: 1,
                                    alignItems: 'center',
                                }}>
                                    <TextField
                                        size="small"
                                        type="text"
                                        label="Start"
                                        value={draft.start}
                                        onChange={e => handleDraftChange(index, {start: e.target.value})}
                                        placeholder="HH:MM"
                                        slotProps={{
                                            inputLabel: {shrink: true},
                                            htmlInput: {inputMode: 'numeric', pattern: '[0-2][0-9]:[0-5][0-9]'},
                                        }}
                                        sx={{width: 112}}
                                    />
                                    <TextField
                                        size="small"
                                        type="text"
                                        label="End"
                                        value={draft.end}
                                        onChange={e => handleDraftChange(index, {end: e.target.value})}
                                        placeholder="HH:MM"
                                        slotProps={{
                                            inputLabel: {shrink: true},
                                            htmlInput: {inputMode: 'numeric', pattern: '[0-2][0-9]:[0-5][0-9]'},
                                        }}
                                        sx={{width: 112}}
                                    />
                                    <Typography variant="body2" sx={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(duration, false)}</Typography>
                                    <IconButton size="small" onClick={() => handleDeleteDraft(index)}>
                                        <DeleteIcon fontSize="small"/>
                                    </IconButton>
                                </Box>
                            );
                        })}
                        {validationMessage && (
                            <Typography variant="body2" color="error">{validationMessage}</Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button startIcon={<AddIcon/>} onClick={handleAddDraft}>Add</Button>
                    <Box sx={{flex: 1}}/>
                    <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={Boolean(validationMessage)}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
