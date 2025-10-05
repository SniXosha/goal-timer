export const formatTime = (ms: number, withMs: boolean) => {
    const totalSec = Math.floor(ms / 1000)
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0")
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")
    const s = String(totalSec % 60).padStart(2, "0")
    if (!withMs) {
        return `${h}:${m}:${s}`
    }
    const mss = String(ms % 1000).padStart(3, "0")
    return `${h}:${m}:${s}.${mss}`
};