import {useState} from 'react';
import {Box, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography} from '@mui/material';
import {useTimersStore} from '../main/timersState.ts';
import {addDays, formatCompactDuration, localDateStr, localDayStart} from '../../common/dateUtils.ts';
import {dailyTotals, hourlyDistribution, timerDuration} from '../../common/timerStats.ts';
import {useNow} from '../../common/useNow.ts';

type Period = '30' | '7' | 'month' | 'custom';
type Datum = {label: string; ms: number};

function TimeChart({data, histogram, label}: {data: Datum[]; histogram?: boolean; label: string}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const width = 900, height = 260, left = 58, right = 16, top = 20, bottom = 40;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const maxHours = Math.max(1, ...data.map(item => item.ms / 3600000));
    const ceiling = Math.ceil(maxHours * 4) / 4;
    const step = plotWidth / Math.max(1, data.length);
    const x = (index: number) => left + step * (index + 0.5);
    const y = (ms: number) => top + plotHeight * (1 - ms / 3600000 / ceiling);
    const tickEvery = Math.max(1, Math.ceil(data.length / 12));
    const selected = hovered === null ? null : data[hovered];
    const axisLabel = (item: Datum) => histogram ? item.label : new Date(localDayStart(item.label)).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{minHeight: 24}} aria-live="polite">
                {selected ? `${selected.label}${histogram ? '–' + String((Number(selected.label.slice(0, 2)) + 1) % 24).padStart(2, '0') + ':00' : ''}: ${formatCompactDuration(selected.ms)}` : 'Hover or focus a point to see its total.'}
            </Typography>
            <Box sx={{overflowX: 'auto'}}>
                <Box component="svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}
                    sx={{width: '100%', minWidth: 560, display: 'block', color: 'primary.main'}} onMouseLeave={() => setHovered(null)}>
                    <title>{label}</title>
                    {[0, 1, 2, 3, 4].map(tick => {
                        const value = ceiling * tick / 4;
                        const position = top + plotHeight * (1 - tick / 4);
                        return <g key={tick}>
                            <line x1={left} x2={width - right} y1={position} y2={position} stroke="currentColor" opacity={0.15}/>
                            <text x={left - 8} y={position + 4} textAnchor="end" fill="currentColor" fontSize={12}>{Number(value.toFixed(2))}h</text>
                        </g>;
                    })}
                    {!histogram && <polyline points={data.map((item, index) => `${x(index)},${y(item.ms)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={2}/>}
                    {data.map((item, index) => <g key={item.label}>
                        {histogram ? <rect x={left + step * index + step * 0.12} y={y(item.ms)} width={step * 0.76}
                            height={top + plotHeight - y(item.ms)} fill="currentColor" opacity={index === hovered ? 1 : 0.65}/>
                            : <circle cx={x(index)} cy={y(item.ms)} r={index === hovered ? 5 : 3} fill="currentColor"/>}
                        {(index % tickEvery === 0 || index === data.length - 1) && <text x={x(index)} y={height - 14} textAnchor="middle" fill="currentColor" fontSize={11}>{axisLabel(item)}</text>}
                        <rect x={left + step * index} y={top} width={step} height={plotHeight} fill="transparent" tabIndex={0}
                            role="graphics-symbol" aria-label={`${item.label}: ${formatCompactDuration(item.ms)}`}
                            onMouseEnter={() => setHovered(index)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)}>
                            <title>{item.label}: {formatCompactDuration(item.ms)}</title>
                        </rect>
                    </g>)}
                </Box>
            </Box>
        </Box>
    );
}

export default function StatsPage() {
    const timers = useTimersStore(state => state.timers);
    const now = useNow();
    const today = localDateStr(now);
    const [period, setPeriod] = useState<Period>('30');
    const [customStart, setCustomStart] = useState(() => addDays(today, -29));
    const [customEnd, setCustomEnd] = useState(today);
    const start = period === 'custom' ? customStart : period === 'month' ? `${today.slice(0, 7)}-01` : addDays(today, period === '7' ? -6 : -29);
    const end = period === 'custom' ? customEnd : today;
    const error = !start || !end ? 'Choose a start and end date.' : start > end ? 'Start date must be before end date.'
        : end > today ? 'Choose dates up to today.' : (localDayStart(end) - localDayStart(start)) / 86400000 > 366 ? 'Choose a period of up to one year.' : null;
    const days = error ? [] : dailyTotals(timers, start, end, now);
    const hours = error ? Array<number>(24).fill(0) : hourlyDistribution(timers, start, end, now);
    const total = days.reduce((sum, item) => sum + item.ms, 0);
    const activeDays = days.filter(item => item.ms > 0).length;
    const busiest = hours.indexOf(Math.max(...hours));
    const unrecorded = timers.some(timer => timer.referenceDay && timer.referenceDay >= start && timer.referenceDay <= end
        && timerDuration(timer, now) > timer.intervals.reduce((sum, iv) => sum + Math.max(0, (iv.end ?? now) - iv.start), 0) + 1000);

    return (
        <Stack spacing={3} sx={{width: '100%', maxWidth: 1120, mx: 'auto', p: {xs: 2, md: 4}, boxSizing: 'border-box'}}>
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems={{sm: 'center'}}>
                <Box sx={{mr: 'auto'}}><Typography variant="h4">Stats</Typography><Typography color="text.secondary">See your daily effort and when you spend your time.</Typography></Box>
                <FormControl size="small" sx={{minWidth: 170}}><InputLabel id="stats-period">Period</InputLabel>
                    <Select labelId="stats-period" label="Period" value={period} onChange={event => setPeriod(event.target.value as Period)}>
                        <MenuItem value="30">Last 30 days</MenuItem><MenuItem value="7">Last 7 days</MenuItem><MenuItem value="month">Current month</MenuItem><MenuItem value="custom">Custom dates</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
            {period === 'custom' && <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                <TextField label="From" type="date" size="small" value={customStart} onChange={event => setCustomStart(event.target.value)} slotProps={{inputLabel: {shrink: true}, htmlInput: {max: today}}}/>
                <TextField label="To" type="date" size="small" value={customEnd} onChange={event => setCustomEnd(event.target.value)} slotProps={{inputLabel: {shrink: true}, htmlInput: {max: today}}}/>
            </Stack>}
            {error ? <Typography color="error">{error}</Typography> : <>
                <Typography variant="body2" color="text.secondary">{start} — {end} · {days.length} days</Typography>
                <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))'}, gap: 2}}>
                    {[['Total time', formatCompactDuration(total)], ['Average per day', formatCompactDuration(total / Math.max(1, days.length))], ['Active days', `${activeDays} / ${days.length}`]].map(([label, value]) =>
                        <Paper key={label} variant="outlined" sx={{p: 2}}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h5">{value}</Typography></Paper>)}
                </Box>
                {total === 0 && !hours.some(ms => ms > 0) && <Typography color="text.secondary">No time recorded for this period yet.</Typography>}
                <Paper variant="outlined" sx={{p: {xs: 2, md: 3}}}>
                    <Typography variant="h6">Time spent each day</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>All time belongs to the day its timer was created, including sessions that continue into later days.</Typography>
                    <TimeChart data={days.map(day => ({label: day.day, ms: day.ms}))} label="Daily time in hours"/>
                </Paper>
                <Paper variant="outlined" sx={{p: {xs: 2, md: 3}}}>
                    <Typography variant="h6">Time by hour of day</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>Actual time spent within this period, split into local clock hours across all timers. {hours.some(ms => ms > 0) ? `Busiest hour: ${String(busiest).padStart(2, '0')}:00.` : ''}</Typography>
                    <TimeChart data={hours.map((ms, hour) => ({label: `${String(hour).padStart(2, '0')}:00`, ms}))} histogram label="Time distribution across 24 local clock hours"/>
                    {unrecorded && <Typography variant="caption" color="text.secondary">Some older time has no recorded intervals. It contributes to daily totals but cannot be placed in an hourly bin.</Typography>}
                </Paper>
            </>}
        </Stack>
    );
}
