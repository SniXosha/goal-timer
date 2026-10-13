import {useEffect, useState} from 'react';

// Refresh after a sleeping/background tab wakes up as well as while it is visible.
export function useNow(refreshMs: number | null = 1000): number {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const refresh = () => setNow(Date.now());
        const interval = refreshMs === null ? null : setInterval(refresh, refreshMs);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            if (interval !== null) clearInterval(interval);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [refreshMs]);
    return now;
}
