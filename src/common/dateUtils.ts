export function localDateStr(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDayStart(day: string): number {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date).getTime();
}

export function addDays(day: string, count: number): string {
    const date = new Date(localDayStart(day));
    date.setDate(date.getDate() + count);
    return localDateStr(date.getTime());
}

export function calendarDays(month: Date): Date[] {
    const offset = (month.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({length: cells}, (_, index) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + index));
}

export function formatCompactDuration(ms: number): string {
    const minutes = Math.round(Math.max(0, ms) / 60000);
    const hours = Math.floor(minutes / 60);
    return hours === 0 ? `${minutes}m` : minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
}
