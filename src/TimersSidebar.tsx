import {useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {localDayStart, type TimerEntry, useTimersStore} from './pages/main/timersState.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
type SidebarMode = 'list' | 'calendar';

function localDateStr(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatCompactDuration(ms: number): string {
    if (ms <= 0) return '0m';
    const totalMinutes = Math.round(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

function dayDuration(timer: TimerEntry, dayStart: number, now: number): number {
    const dayEnd = dayStart + DAY_MS;
    return timer.intervals.reduce((total, iv) => {
        const start = Math.max(iv.start, dayStart);
        const end = Math.min(iv.end ?? now, dayEnd);
        if (end <= start) return total;
        return total + end - start;
    }, 0);
}

function hasTimerOnDay(timer: TimerEntry, dayStart: number): boolean {
    const dayEnd = dayStart + DAY_MS;
    return timer.intervals.some(iv => {
        const end = iv.end ?? iv.start;
        return (iv.start >= dayStart && iv.start < dayEnd) || (end > dayStart && end <= dayEnd) || (iv.start <= dayStart && end >= dayEnd);
    });
}

function monthLabel(date: Date): string {
    return date.toLocaleString(undefined, {month: 'long', year: 'numeric'});
}

function addMonths(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export const TimersSidebar = () => {
    const {timers, activeTimerId, createTimer, deleteTimer, setActiveTimerId, updateTimer} = useTimersStore();
    const [collapsed, setCollapsed] = useState(false);
    const [mode, setMode] = useState<SidebarMode>('calendar');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [timerToDelete, setTimerToDelete] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(() => localDateStr(Date.now()));

    const handleDeleteClick = (id: string) => {
        setTimerToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (timerToDelete) deleteTimer(timerToDelete);
        setDeleteDialogOpen(false);
        setTimerToDelete(null);
    };

    const handleRenameStart = (id: string, currentName: string) => {
        setRenamingId(id);
        setRenameValue(currentName);
    };

    const handleRenameCommit = () => {
        if (renamingId && renameValue.trim()) {
            updateTimer(renamingId, {name: renameValue.trim()});
        }
        setRenamingId(null);
    };

    const selectTimerForDay = (timer: TimerEntry, dayStr: string) => {
        setActiveTimerId(timer.id);
        updateTimer(timer.id, {referenceDay: dayStr});
    };

    const handleDayClick = (day: Date) => {
        const dayStr = localDateStr(day.getTime());
        const dayStart = localDayStart(dayStr);
        setSelectedDay(dayStr);
        const timersOnDay = timers
            .map(timer => ({timer, duration: dayDuration(timer, dayStart, Date.now()), hasSegment: hasTimerOnDay(timer, dayStart)}))
            .filter(item => item.hasSegment);

        if (timersOnDay.length === 0) {
            if (dayStart <= Date.now()) createTimer(dayStr);
            return;
        }

        const timerToSelect = timersOnDay.sort((a, b) => b.duration - a.duration)[0].timer;
        selectTimerForDay(timerToSelect, dayStr);
    };

    const timerToDeleteEntry = timers.find(t => t.id === timerToDelete);
    const now = Date.now();
    const firstWeekday = calendarMonth.getDay();
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const calendarCells = [
        ...Array.from({length: firstWeekday}, () => null),
        ...Array.from({length: daysInMonth}, (_, i) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1)),
    ];
    const selectedDayStart = localDayStart(selectedDay);
    const selectedDayTimers = timers
        .map(timer => ({timer, duration: dayDuration(timer, selectedDayStart, now), hasSegment: hasTimerOnDay(timer, selectedDayStart)}))
        .filter(item => item.hasSegment)
        .sort((a, b) => b.duration - a.duration || a.timer.name.localeCompare(b.timer.name));
    const listDays = Array.from(new Set(
        timers.flatMap(timer => timer.intervals.map(interval => localDateStr(interval.start)))
    )).sort((a, b) => b.localeCompare(a));
    const timersWithoutDates = timers.filter(timer => timer.intervals.length === 0);

    return (
        <Box sx={{display: 'flex', flexShrink: 0, height: '100%'}}>
            <Box sx={{
                width: collapsed ? 0 : '24vw',
                minWidth: collapsed ? 0 : 220,
                maxWidth: collapsed ? 0 : 360,
                overflow: 'hidden',
                transition: 'width 0.2s ease, min-width 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                borderRight: collapsed ? 0 : 1,
                borderColor: 'divider',
            }}>
                <Stack direction="row" alignItems="center" px={1.25} py={1} spacing={1}
                       sx={{borderBottom: 1, borderColor: 'divider', flexShrink: 0}}>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={mode}
                        onChange={(_, value: SidebarMode | null) => value && setMode(value)}
                        sx={{mr: 'auto'}}
                    >
                        <ToggleButton value="list" aria-label="Timer list"><ViewListIcon fontSize="small"/></ToggleButton>
                        <ToggleButton value="calendar" aria-label="Calendar"><CalendarMonthIcon fontSize="small"/></ToggleButton>
                    </ToggleButtonGroup>
                    <IconButton size="small" onClick={() => mode === 'calendar' ? createTimer(selectedDay) : createTimer()} disabled={mode === 'calendar' && selectedDayStart > now}>
                        <AddIcon fontSize="small"/>
                    </IconButton>
                </Stack>

                {mode === 'list' && (
                    <Box sx={{flex: 1, overflowY: 'auto', overflowX: 'hidden'}}>
                        {listDays.length === 0 && timersWithoutDates.length === 0 && (
                            <Typography variant="body2" color="textSecondary" px={1.5} py={1}>No timers</Typography>
                        )}
                        {listDays.map(dayStr => {
                            const dayStart = localDayStart(dayStr);
                            const dayTimers = timers
                                .map(timer => ({timer, duration: dayDuration(timer, dayStart, now), hasSegment: hasTimerOnDay(timer, dayStart)}))
                                .filter(item => item.hasSegment)
                                .sort((a, b) => b.duration - a.duration || a.timer.name.localeCompare(b.timer.name));

                            return (
                                <Box key={dayStr}>
                                    <Typography variant="caption" color="textSecondary" display="block" px={1.5} pt={1} pb={0.25}>
                                        {dayStr}
                                    </Typography>
                                    <List dense disablePadding>
                                        {dayTimers.map(({timer, duration}) => (
                                            <ListItem key={`${dayStr}-${timer.id}`} disablePadding>
                                                {renamingId === timer.id ? (
                                                    <Box sx={{px: 1, py: 0.5, width: '100%', boxSizing: 'border-box'}}>
                                                        <TextField
                                                            size="small"
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onBlur={handleRenameCommit}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleRenameCommit();
                                                                if (e.key === 'Escape') setRenamingId(null);
                                                            }}
                                                            autoFocus
                                                            fullWidth
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Box sx={{display: 'flex', width: '100%', alignItems: 'center'}}>
                                                        <ListItemButton
                                                            selected={timer.id === activeTimerId && timer.referenceDay === dayStr}
                                                            onClick={() => selectTimerForDay(timer, dayStr)}
                                                            sx={{flex: 1, minWidth: 0, py: 0.5}}
                                                        >
                                                            <ListItemText
                                                                primary={timer.name}
                                                                secondary={formatCompactDuration(duration)}
                                                                primaryTypographyProps={{noWrap: true}}
                                                            />
                                                        </ListItemButton>
                                                        <IconButton size="small" onClick={() => handleRenameStart(timer.id, timer.name)}>
                                                            <EditIcon sx={{fontSize: 16}}/>
                                                        </IconButton>
                                                        <IconButton size="small" disabled={timers.length === 1} onClick={() => handleDeleteClick(timer.id)}>
                                                            <DeleteIcon sx={{fontSize: 16}}/>
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            );
                        })}
                        {timersWithoutDates.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="textSecondary" display="block" px={1.5} pt={1} pb={0.25}>
                                    No activity
                                </Typography>
                                <List dense disablePadding>
                                    {timersWithoutDates.map(timer => (
                                        <ListItem key={`no-date-${timer.id}`} disablePadding>
                                            {renamingId === timer.id ? (
                                                <Box sx={{px: 1, py: 0.5, width: '100%', boxSizing: 'border-box'}}>
                                                    <TextField
                                                        size="small"
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onBlur={handleRenameCommit}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleRenameCommit();
                                                            if (e.key === 'Escape') setRenamingId(null);
                                                        }}
                                                        autoFocus
                                                        fullWidth
                                                    />
                                                </Box>
                                            ) : (
                                                <Box sx={{display: 'flex', width: '100%', alignItems: 'center'}}>
                                                    <ListItemButton
                                                        selected={timer.id === activeTimerId}
                                                        onClick={() => setActiveTimerId(timer.id)}
                                                        sx={{flex: 1, minWidth: 0, py: 0.5}}
                                                    >
                                                        <ListItemText primary={timer.name} primaryTypographyProps={{noWrap: true}}/>
                                                    </ListItemButton>
                                                    <IconButton size="small" onClick={() => handleRenameStart(timer.id, timer.name)}>
                                                        <EditIcon sx={{fontSize: 16}}/>
                                                    </IconButton>
                                                    <IconButton size="small" disabled={timers.length === 1} onClick={() => handleDeleteClick(timer.id)}>
                                                        <DeleteIcon sx={{fontSize: 16}}/>
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Box>
                )}

                {mode === 'calendar' && (
                    <Box sx={{display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1}}>
                        <Box sx={{p: 1.25, borderBottom: 1, borderColor: 'divider'}}>
                            <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                                <IconButton size="small" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>
                                    <NavigateBeforeIcon fontSize="small"/>
                                </IconButton>
                                <Typography variant="subtitle2" sx={{flex: 1, textAlign: 'center'}}>{monthLabel(calendarMonth)}</Typography>
                                <IconButton size="small" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                                    <NavigateNextIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5}}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
                                    <Typography key={`${label}-${i}`} variant="caption" color="textSecondary" textAlign="center">{label}</Typography>
                                ))}
                                {calendarCells.map((day, index) => {
                                    if (!day) return <Box key={`empty-${index}`} sx={{aspectRatio: '1 / 1'}}/>;
                                    const dayStr = localDateStr(day.getTime());
                                    const dayStart = localDayStart(dayStr);
                                    const durations = timers.map(timer => ({timer, duration: dayDuration(timer, dayStart, now)}));
                                    const total = durations.reduce((sum, item) => sum + item.duration, 0);
                                    const activeCount = durations.filter(item => item.duration > 0 || hasTimerOnDay(item.timer, dayStart)).length;
                                    const isToday = dayStr === localDateStr(now);
                                    const isSelected = dayStr === selectedDay;

                                    return (
                                        <Button
                                            key={dayStr}
                                            size="small"
                                            onClick={() => handleDayClick(day)}
                                            disabled={dayStart > now}
                                            sx={{
                                                aspectRatio: '1 / 1',
                                                minWidth: 0,
                                                p: 0.35,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'stretch',
                                                justifyContent: 'flex-start',
                                                border: isSelected ? 2 : isToday ? 1 : 0,
                                                borderColor: isSelected ? 'primary.main' : 'divider',
                                                color: 'text.primary',
                                                textTransform: 'none',
                                                lineHeight: 1.05,
                                            }}
                                        >
                                            <Typography variant="caption" sx={{fontSize: '0.68rem', alignSelf: 'flex-start'}}>{day.getDate()}</Typography>
                                            <Typography variant="caption" fontWeight={total > 0 ? 700 : 400} sx={{fontSize: '0.62rem', mt: 'auto'}}>
                                                {total > 0 ? formatCompactDuration(total) : activeCount > 0 ? '0m' : ''}
                                            </Typography>
                                            {activeCount > 1 && (
                                                <Typography variant="caption" color="textSecondary" sx={{fontSize: '0.55rem'}}>
                                                    {activeCount} timers
                                                </Typography>
                                            )}
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>

                        <Box sx={{flex: 1, overflowY: 'auto'}}>
                            <Typography variant="caption" color="textSecondary" display="block" px={1.5} pt={1} pb={0.5}>
                                {selectedDay}
                            </Typography>
                            <List dense>
                                {selectedDayTimers.length === 0 && (
                                    <ListItem>
                                        <ListItemText primary="No timers" secondary={selectedDayStart > now ? 'Future days cannot be edited yet' : 'Click the day to create one'} />
                                    </ListItem>
                                )}
                                {selectedDayTimers.map(({timer, duration}) => (
                                    <ListItem key={timer.id} disablePadding>
                                        <ListItemButton
                                            selected={timer.id === activeTimerId}
                                            onClick={() => selectTimerForDay(timer, selectedDay)}
                                            sx={{py: 0.5}}
                                        >
                                            <ListItemText
                                                primary={timer.name}
                                                secondary={formatCompactDuration(duration)}
                                                primaryTypographyProps={{noWrap: true}}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Box>
                )}
            </Box>

            <Box
                onClick={() => setCollapsed(!collapsed)}
                sx={{
                    width: 16,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRight: 1,
                    borderColor: 'divider',
                    '&:hover': {backgroundColor: 'action.hover'},
                    transition: 'background-color 0.1s',
                }}
            >
                {collapsed ? <ChevronRightIcon sx={{fontSize: 14}}/> : <ChevronLeftIcon sx={{fontSize: 14}}/>}
            </Box>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete timer</DialogTitle>
                <DialogContent>
                    Delete "{timerToDeleteEntry?.name}"? This cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
