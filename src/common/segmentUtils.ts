import {localDateStr} from './dateUtils.ts';

export function toSegmentInput(timestamp: number): string {
    const date = new Date(timestamp);
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(value => String(value).padStart(2, '0')).join(':');
    return `${localDateStr(timestamp)}T${time}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

export function parseSegmentDate(value: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && toSegmentInput(timestamp).slice(0, 16) === value.slice(0, 16) ? timestamp : null;
}

export function validateSegments(drafts: {start: string; end: string}[], now: number): string | null {
    if (drafts.filter(draft => draft.end === '').length > 1) return 'Only one segment can be running.';
    const parsed = drafts.map((draft, index) => ({index, start: parseSegmentDate(draft.start), end: draft.end ? parseSegmentDate(draft.end) : now}));
    for (const item of parsed) {
        if (item.start === null || item.end === null) return `Row ${item.index + 1}: Choose valid dates and times.`;
        if (item.end < item.start) return `Row ${item.index + 1}: End cannot be before start.`;
        if (item.start > now || item.end > now) return `Row ${item.index + 1}: Segments cannot exceed the current time.`;
    }
    const sorted = parsed.sort((a, b) => a.start! - b.start!);
    for (let index = 1; index < sorted.length; index++) {
        if (sorted[index - 1].end! > sorted[index].start!) return `Rows ${sorted[index - 1].index + 1} and ${sorted[index].index + 1} intersect.`;
    }
    return null;
}
