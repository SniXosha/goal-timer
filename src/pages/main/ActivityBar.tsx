import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {localDayStart, useTimersStore} from "./timersState.ts";
import {useMemo, useState} from "react";
import {formatTime} from "../../common/timeUtils.ts";
import {addDays, localDateStr} from "../../common/dateUtils.ts";
import {useNow} from "../../common/useNow.ts";
import {parseSegmentDate, toSegmentInput, validateSegments} from "../../common/segmentUtils.ts";

const MINUTE_MS = 60 * 1000;

interface DraftSegment {
    start: string;
    end: string;
}

interface Props {
    timerId: string;
}

export const ActivityBar = ({timerId}: Props) => {
    const timer = useTimersStore(state => state.timers.find(t => t.id === timerId));
    const replaceIntervals = useTimersStore(state => state.replaceIntervals);
    const referenceDay = timer?.referenceDay ?? null;
    const intervals = useMemo(() => timer?.intervals ?? [], [timer?.intervals]);

    const now = useNow();
    const [editorOpen, setEditorOpen] = useState(false);
    const [drafts, setDrafts] = useState<DraftSegment[]>([]);
    const visibleDay = referenceDay ?? localDateStr(now);
    const dayStart = localDayStart(visibleDay);
    const dayEnd = localDayStart(addDays(visibleDay, 1));
    const dayIntervals = intervals.filter(iv => iv.start < dayEnd && (iv.end ?? now) > dayStart);
    const validationMessage = editorOpen ? validateSegments(drafts, now) : null;

    const toPercent = (ms: number): number => ((ms - dayStart) / (dayEnd - dayStart)) * 100;

    const openEditor = () => {
        setDrafts(
            [...intervals]
                .sort((a, b) => a.start - b.start)
                .map(iv => ({start: toSegmentInput(iv.start), end: iv.end === null ? '' : toSegmentInput(iv.end)}))
        );
        setEditorOpen(true);
    };

    const handleDraftChange = (index: number, patch: Partial<DraftSegment>) => {
        setDrafts(current => current.map((draft, i) => i === index ? {...draft, ...patch} : draft));
    };

    const handleAddDraft = () => {
        const start = Math.min(Math.max(dayStart + 9 * 60 * MINUTE_MS, dayStart), Math.min(now, dayEnd - MINUTE_MS));
        const end = Math.min(start + 60 * MINUTE_MS, now, dayEnd - MINUTE_MS);
        setDrafts(current => [...current, {start: toSegmentInput(start), end: toSegmentInput(Math.max(start, end))}]);
    };

    const handleDeleteDraft = (index: number) => {
        setDrafts(current => current.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!timer || validationMessage) return;
        const editedIntervals = drafts.map(draft => ({
            start: parseSegmentDate(draft.start) ?? dayStart,
            end: draft.end ? parseSegmentDate(draft.end) ?? dayStart : null,
        }));
        replaceIntervals(timerId, editedIntervals);
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
            {intervals.some(iv => (iv.end ?? now) > dayEnd) && <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                This timer continues beyond {visibleDay}. Its full duration is assigned to {visibleDay}; the timeline shows this day only.
            </Typography>}
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

            <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Timer segments</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} pt={0.5}>
                        <Typography variant="body2" color="text.secondary">Edit full dates for sessions crossing midnight. All segments belong to {visibleDay}. Leave the end blank for a running segment.</Typography>
                        {drafts.length === 0 && (
                            <Typography variant="body2" color="textSecondary">No segments recorded for this timer.</Typography>
                        )}
                        {drafts.map((draft, index) => {
                            const start = parseSegmentDate(draft.start);
                            const end = draft.end ? parseSegmentDate(draft.end) : now;
                            const duration = start !== null && end !== null ? Math.max(0, end - start) : 0;
                            return (
                                <Box key={index} sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {xs: 'minmax(0, 1fr) 32px', sm: 'minmax(0, 1fr) minmax(0, 1fr) 78px 32px'},
                                    gap: 1,
                                    alignItems: 'center',
                                }}>
                                    <TextField
                                        size="small"
                                        type="datetime-local"
                                        label="Start"
                                        value={draft.start}
                                        onChange={e => handleDraftChange(index, {start: e.target.value})}
                                        slotProps={{
                                            inputLabel: {shrink: true},
                                            htmlInput: {step: '0.001'},
                                        }}
                                        sx={{minWidth: 0, gridColumn: {xs: '1', sm: 'auto'}}}
                                    />
                                    <TextField
                                        size="small"
                                        type="datetime-local"
                                        label="End (blank = running)"
                                        value={draft.end}
                                        onChange={e => handleDraftChange(index, {end: e.target.value})}
                                        slotProps={{
                                            inputLabel: {shrink: true},
                                            htmlInput: {step: '0.001'},
                                        }}
                                        sx={{minWidth: 0, gridColumn: {xs: '1', sm: 'auto'}}}
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
