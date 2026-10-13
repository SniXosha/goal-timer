import {useEffect, useRef, useState} from 'react';
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem,
    ListItemButton, ListItemText, Stack, TextField, Typography} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {useTimersStore} from './pages/main/timersState.ts';
import {calendarDays, formatCompactDuration, localDateStr, localDayStart} from './common/dateUtils.ts';
import {timerDuration} from './common/timerStats.ts';
import {useNow} from './common/useNow.ts';

export const TimersSidebar = () => {
    const {timers, activeTimerId, createTimer, selectDay, deleteTimer, setActiveTimerId, updateTimer} = useTimersStore();
    const now = useNow();
    const today = localDateStr(now);
    const previousToday = useRef(today);
    const [collapsed, setCollapsed] = useState(false);
    const [timerToDelete, setTimerToDelete] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(today);

    useEffect(() => {
        const oldToday = previousToday.current;
        if (today === oldToday) return;
        previousToday.current = today;
        // Follow the current day/month only when the user was viewing it.
        setSelectedDay(day => day === oldToday ? today : day);
        setCalendarMonth(month => localDateStr(month.getTime()).slice(0, 7) === oldToday.slice(0, 7)
            ? new Date(new Date(localDayStart(today)).getFullYear(), new Date(localDayStart(today)).getMonth(), 1) : month);
    }, [today]);

    const navigateMonth = (delta: number) => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() + delta, 1));
    const select = (day: string) => {
        setSelectedDay(day);
        selectDay(day);
    };
    const rename = () => {
        if (renamingId && renameValue.trim()) updateTimer(renamingId, {name: renameValue.trim()});
        setRenamingId(null);
    };
    const selectedTimers = timers.filter(timer => timer.referenceDay === selectedDay)
        .sort((a, b) => timerDuration(b, now) - timerDuration(a, now) || a.name.localeCompare(b.name));
    const dayTotals = new Map<string, {ms: number; count: number}>();
    for (const timer of timers) {
        if (!timer.referenceDay) continue;
        const entry = dayTotals.get(timer.referenceDay) ?? {ms: 0, count: 0};
        dayTotals.set(timer.referenceDay, {ms: entry.ms + timerDuration(timer, now), count: entry.count + 1});
    }

    return (
        <Box sx={{display: 'flex', flexShrink: 0, minHeight: 0, height: {xs: 'auto', md: '100%'}, width: {xs: '100%', md: 'auto'}}}>
            <Box sx={{width: collapsed ? 0 : {xs: '100%', md: 336}, minWidth: 0, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', borderRight: collapsed ? 0 : 1, borderColor: 'divider'}}>
                <Stack direction="row" alignItems="center" px={1.5} py={1} sx={{borderBottom: 1, borderColor: 'divider'}}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{mr: 'auto'}}>Calendar</Typography>
                    <Button size="small" onClick={() => {
                        const date = new Date(localDayStart(today));
                        setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        select(today);
                    }}>Today</Button>
                    <IconButton size="small" aria-label="Add timer for selected day" onClick={() => createTimer(selectedDay)} disabled={selectedDay > today}>
                        <AddIcon fontSize="small"/>
                    </IconButton>
                </Stack>
                <Box sx={{p: 1.25, borderBottom: 1, borderColor: 'divider', flexShrink: 0}}>
                    <Stack direction="row" alignItems="center" mb={1}>
                        <IconButton size="small" aria-label="Previous month" onClick={() => navigateMonth(-1)}><ChevronLeftIcon fontSize="small"/></IconButton>
                        <Typography variant="subtitle2" noWrap sx={{flex: 1, textAlign: 'center', minWidth: 0}}>
                            {calendarMonth.toLocaleString(undefined, {month: 'long', year: 'numeric'})}
                        </Typography>
                        <IconButton size="small" aria-label="Next month" onClick={() => navigateMonth(1)}><ChevronRightIcon fontSize="small"/></IconButton>
                    </Stack>
                    <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5}}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => (
                            <Typography key={label} variant="caption" color="text.secondary" textAlign="center" sx={{fontSize: '0.65rem'}}>{label}</Typography>
                        ))}
                        {calendarDays(calendarMonth).map(day => {
                            const dayStr = localDateStr(day.getTime());
                            const total = dayTotals.get(dayStr);
                            const muted = day.getMonth() !== calendarMonth.getMonth();
                            const selected = dayStr === selectedDay;
                            return (
                                <Button key={dayStr} size="small" onClick={() => select(dayStr)} disabled={dayStr > today}
                                    aria-label={`${dayStr}, ${formatCompactDuration(total?.ms ?? 0)}, ${total?.count ?? 0} timers`}
                                    aria-pressed={selected}
                                    title={`${dayStr}: ${formatCompactDuration(total?.ms ?? 0)}${total ? ` · ${total.count} timer${total.count === 1 ? '' : 's'}` : ''}`}
                                    sx={{height: 66, minWidth: 0, width: '100%', p: 0.5, overflow: 'hidden', boxSizing: 'border-box',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch',
                                        border: 1, borderColor: selected ? 'primary.main' : dayStr === today ? 'text.secondary' : 'divider',
                                        backgroundColor: selected ? 'action.selected' : muted ? 'action.hover' : 'transparent',
                                        color: muted ? 'text.disabled' : 'text.primary', textTransform: 'none',
                                        outline: selected ? '1px solid' : 'none', outlineColor: 'primary.main'}}>
                                    <Typography component="span" sx={{fontSize: '0.75rem', textAlign: 'left', lineHeight: 1.2}}>{day.getDate()}</Typography>
                                    <Typography component="span" noWrap sx={{fontSize: '0.62rem', lineHeight: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>
                                        {total ? formatCompactDuration(total.ms) : '\u00a0'}
                                    </Typography>
                                    <Typography component="span" noWrap sx={{fontSize: '0.55rem', lineHeight: 1.2}}>
                                        {total && total.count > 1 ? `${total.count} timers` : '\u00a0'}
                                    </Typography>
                                </Button>
                            );
                        })}
                    </Box>
                </Box>
                <Box sx={{flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: {xs: 180, md: 'none'}}}>
                    <Typography variant="caption" color="text.secondary" display="block" px={1.5} pt={1}>{selectedDay}</Typography>
                    <List dense>
                        {selectedTimers.length === 0 && <ListItem><ListItemText primary="No timers" secondary={selectedDay > today ? 'Future day' : 'Click this day to create a timer'}/></ListItem>}
                        {selectedTimers.map(timer => (
                            <ListItem key={timer.id} disablePadding>
                                {renamingId === timer.id ? <TextField size="small" value={renameValue} autoFocus fullWidth sx={{m: 1}}
                                    onChange={event => setRenameValue(event.target.value)} onBlur={rename}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter') rename();
                                        if (event.key === 'Escape') setRenamingId(null);
                                    }}/>
                                    : <Box sx={{display: 'flex', width: '100%', minWidth: 0, alignItems: 'center'}}>
                                        <ListItemButton selected={timer.id === activeTimerId} onClick={() => setActiveTimerId(timer.id)} sx={{minWidth: 0}}>
                                            <ListItemText primary={timer.name} secondary={formatCompactDuration(timerDuration(timer, now))}
                                                slotProps={{primary: {noWrap: true, title: timer.name}}}/>
                                        </ListItemButton>
                                        <IconButton size="small" aria-label={`Rename ${timer.name}`} onClick={() => {setRenamingId(timer.id); setRenameValue(timer.name);}}><EditIcon sx={{fontSize: 16}}/></IconButton>
                                        <IconButton size="small" aria-label={`Delete ${timer.name}`} disabled={timers.length === 1} onClick={() => setTimerToDelete(timer.id)}><DeleteIcon sx={{fontSize: 16}}/></IconButton>
                                    </Box>}
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Box>
            <IconButton aria-label={collapsed ? 'Expand calendar' : 'Collapse calendar'} onClick={() => setCollapsed(!collapsed)}
                sx={{width: 20, flexShrink: 0, borderRadius: 0, borderRight: 1, borderColor: 'divider', px: 0}}>
                {collapsed ? <ChevronRightIcon sx={{fontSize: 16}}/> : <ChevronLeftIcon sx={{fontSize: 16}}/>}
            </IconButton>
            <Dialog open={timerToDelete !== null} onClose={() => setTimerToDelete(null)}>
                <DialogTitle>Delete timer</DialogTitle>
                <DialogContent>Delete "{timers.find(timer => timer.id === timerToDelete)?.name}"? This cannot be undone.</DialogContent>
                <DialogActions>
                    <Button onClick={() => setTimerToDelete(null)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => {if (timerToDelete) deleteTimer(timerToDelete); setTimerToDelete(null);}}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
