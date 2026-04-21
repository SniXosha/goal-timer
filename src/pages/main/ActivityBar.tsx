import {Box, Typography} from "@mui/material";
import {useActivityStore} from "./activityState.ts";
import {useEffect, useState} from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

function localDayStart(dayStr: string): number {
    const [y, m, d] = dayStr.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
}

export const ActivityBar = () => {
    const {referenceDay, intervals} = useActivityStore();
    const [now, setNow] = useState(Date.now());

    const hasOpenInterval = intervals.some(iv => iv.end === null);

    useEffect(() => {
        if (!hasOpenInterval) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [hasOpenInterval]);

    const dayStart = referenceDay ? localDayStart(referenceDay) : null;
    const dayEnd = dayStart !== null ? dayStart + DAY_MS : null;

    const toPercent = (ms: number): number =>
        dayStart !== null ? ((ms - dayStart) / DAY_MS) * 100 : 0;

    return (
        <Box sx={{width: '100%', px: 4, pb: 2, pt: 1, boxSizing: 'border-box'}}>
            <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
                {referenceDay ? `Activity — ${referenceDay}` : 'Activity — start the timer to begin recording'}
            </Typography>
            <Box sx={{position: 'relative', width: '100%'}}>
                {/* Bar track */}
                <Box sx={{
                    width: '100%',
                    height: 8,
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {dayStart !== null && dayEnd !== null && intervals.map((iv, i) => {
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
                {/* Ticks */}
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
        </Box>
    );
};
