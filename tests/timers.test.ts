import {beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import {addDays, calendarDays, localDateStr, localDayStart} from '../src/common/dateUtils.ts';
import {dailyTotals, hourlyDistribution, timerDuration} from '../src/common/timerStats.ts';
import {parseSegmentDate, toSegmentInput, validateSegments} from '../src/common/segmentUtils.ts';
import type {TimerEntry} from '../src/pages/main/timersState.ts';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
}});
const {useTimersStore, migrateTimer} = await import('../src/pages/main/timersState.ts');
const store = () => useTimersStore.getState();
const hour = 3600000;
const at = (day: string, h = 0, m = 0) => new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();

beforeEach(() => {
    process.env.TZ = 'Europe/Moscow';
    storage.clear();
    useTimersStore.setState({timers: [], activeTimerId: ''});
});

function create(day = '2026-10-01'): TimerEntry {
    store().createTimer(day);
    return store().timers.at(-1)!;
}

test('Monday calendar includes adjoining month days and whole weeks', () => {
    const days = calendarDays(new Date(2026, 9, 1));
    assert.equal(days[0].getDay(), 1);
    assert.deepEqual(days.slice(0, 7).map(day => localDateStr(day.getTime())), [
        '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
    assert.equal(days.length % 7, 0);
    assert.equal(localDateStr(days.at(-1)!.getTime()), '2026-11-01');
    assert.equal(localDateStr(calendarDays(new Date(2027, 1, 1))[0].getTime()), '2027-02-01');
});

test('repeated day selection reuses an empty or reset timer, including after reload', async () => {
    create();
    const id = store().activeTimerId;
    store().selectDay('2026-10-01');
    store().selectDay('2026-10-01');
    assert.equal(store().timers.length, 1);
    store().resetActivity(id);
    await useTimersStore.persist.rehydrate();
    store().selectDay('2026-10-01');
    assert.equal(store().timers.length, 1);
    assert.equal(store().activeTimerId, id);
});

test('next-day click creates exactly one new timer, while explicit add permits another', () => {
    create();
    store().selectDay('2026-10-02');
    store().selectDay('2026-10-02');
    assert.equal(store().timers.length, 2);
    store().createTimer('2026-10-02');
    assert.equal(store().timers.length, 3);
});

test('a week-long running timer stays entirely on its creation day before and after pause', () => {
    const timer = create();
    const start = at('2026-10-01', 23, 30);
    const end = start + 7 * 24 * hour;
    store().startInterval(timer.id, start);
    let totals = dailyTotals(store().timers, '2026-10-01', '2026-10-08', end);
    assert.equal(totals[0].ms, 168 * hour);
    assert.ok(totals.slice(1).every(day => day.ms === 0));
    store().closeCurrentInterval(timer.id, end);
    totals = dailyTotals(store().timers, '2026-10-01', '2026-10-08', end);
    assert.equal(totals[0].ms, 168 * hour);
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
    assert.equal(store().timers[0].lastStarted, null);
    assert.equal(store().timers[0].intervals[0].end, end);
});

test('start and pause are idempotent and resumed sessions keep their original day', () => {
    const timer = create();
    store().startInterval(timer.id, at('2026-10-01', 23));
    store().startInterval(timer.id, at('2026-10-01', 23, 30));
    store().closeCurrentInterval(timer.id, at('2026-10-02', 1));
    store().closeCurrentInterval(timer.id, at('2026-10-02', 2));
    store().startInterval(timer.id, at('2026-10-03', 12));
    store().closeCurrentInterval(timer.id, at('2026-10-03', 13));
    assert.equal(store().timers[0].accumulatedMs, 3 * hour);
    assert.equal(store().timers[0].intervals.length, 2);
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
});

test('histogram averages across actual activity days and clips to the selected period', () => {
    const timer = create();
    store().startInterval(timer.id, at('2026-10-01', 23, 30));
    store().closeCurrentInterval(timer.id, at('2026-10-02', 1, 15));
    const bins = hourlyDistribution(store().timers, '2026-10-01', '2026-10-02', at('2026-10-03'));
    assert.equal(bins[23], hour / 4);
    assert.equal(bins[0], hour / 2);
    assert.equal(bins[1], hour / 8);
    assert.equal(bins.reduce((a, b) => a + b), 0.875 * hour);
    const clipped = hourlyDistribution(store().timers, '2026-10-02', '2026-10-02', at('2026-10-03'));
    assert.equal(clipped[23], 0);
    assert.equal(clipped.reduce((a, b) => a + b), 1.25 * hour);
    assert.equal(dailyTotals(store().timers, '2026-10-02', '2026-10-02', at('2026-10-03'))[0].ms, 0);
});

test('histogram normalizes all seven days of a running interval', () => {
    const timer = create();
    const start = at('2026-10-01');
    const end = at('2026-10-08');
    store().startInterval(timer.id, start);
    const bins = hourlyDistribution(store().timers, '2026-10-01', '2026-10-07', end);
    assert.ok(bins.every(bin => bin === hour));
});

test('histogram uses the same active-day count for every hour and counts each day once', () => {
    const first = create('2026-09-30');
    store().replaceIntervals(first.id, [
        {start: at('2026-10-01', 9), end: at('2026-10-01', 10)},
        {start: at('2026-10-03', 15), end: at('2026-10-03', 16)},
        {start: at('2026-10-08', 9), end: at('2026-10-08', 10)},
    ]);
    const second = create('2026-10-01');
    store().replaceIntervals(second.id, [{start: at('2026-10-01', 9, 30), end: at('2026-10-01', 10)}]);
    create('2026-10-02');
    const unrecorded = create('2026-10-04');
    store().updateTimer(unrecorded.id, {accumulatedMs: 5 * hour});

    const bins = hourlyDistribution(store().timers, '2026-10-01', '2026-10-07', at('2026-10-09'));
    assert.equal(bins[9], 0.75 * hour);
    assert.equal(bins[15], 0.5 * hour);
    assert.ok(bins.every((ms, index) => index === 9 || index === 15 || ms === 0));
});

test('histogram shows zero when the range has no positive recorded activity', () => {
    assert.deepEqual(hourlyDistribution([], '2026-10-01', '2026-10-07', at('2026-10-08')), Array(24).fill(0));
    const timer = create();
    store().updateTimer(timer.id, {accumulatedMs: hour, intervals: [
        {start: at('2026-10-01', 9), end: at('2026-10-01', 9)},
        {start: at('2026-09-30', 23), end: at('2026-10-01')},
        {start: at('2026-10-08'), end: null},
    ]});
    assert.deepEqual(hourlyDistribution(store().timers, '2026-10-01', '2026-10-07', at('2026-10-08')), Array(24).fill(0));
});

test('migration recovers original day and keeps existing totals, IDs, goals, and running time', () => {
    const timer = {...create(), referenceDay: '2026-10-07', accumulatedMs: hour, goalEnabled: true,
        lastStarted: at('2026-10-02'), intervals: [{start: at('2026-10-01'), end: at('2026-10-01')}]};
    const migrated = migrateTimer(timer);
    assert.equal(migrated.referenceDay, '2026-10-01');
    assert.equal(migrated.id, timer.id);
    assert.equal(migrated.goalEnabled, true);
    assert.equal(timerDuration(migrated, at('2026-10-03')), 25 * hour);
    assert.equal(migrated.intervals.at(-1)!.end, null);
});

test('editing or removing all history never moves the timer day or leaves a ghost running session', () => {
    const timer = create();
    store().startInterval(timer.id, at('2026-10-01', 23));
    store().replaceIntervals(timer.id, [{start: at('2026-10-02', 12), end: at('2026-10-03', 12)}], '2026-10-02');
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
    assert.equal(store().timers[0].accumulatedMs, 24 * hour);
    assert.equal(store().timers[0].lastStarted, null);
    store().replaceIntervals(timer.id, []);
    store().selectDay('2026-10-01');
    assert.equal(store().timers.length, 1);
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
});

test('history dates preserve midnight crossings and milliseconds, and validate overlap', () => {
    const start = at('2026-10-01', 23, 30) + 123;
    const end = at('2026-10-08', 1, 30) + 456;
    assert.equal(parseSegmentDate(toSegmentInput(start)), start);
    assert.equal(parseSegmentDate(toSegmentInput(end)), end);
    const drafts = [{start: toSegmentInput(start), end: toSegmentInput(end)}];
    assert.equal(validateSegments(drafts, end + hour), null);
    assert.match(validateSegments([...drafts, {start: toSegmentInput(end - hour), end: ''}], end + hour)!, /intersect/);
    assert.match(validateSegments([{start: toSegmentInput(end), end: ''}, {start: toSegmentInput(end), end: ''}], end + hour)!, /one segment/);
});

test('DST transitions keep calendar days and hourly elapsed totals correct', () => {
    process.env.TZ = 'America/New_York';
    assert.equal(addDays('2026-03-08', 1), '2026-03-09');
    assert.equal(localDayStart('2026-03-09') - localDayStart('2026-03-08'), 23 * hour);
    const timer = create('2026-03-08');
    store().replaceIntervals(timer.id, [{start: at('2026-03-08'), end: at('2026-03-09')}]);
    const spring = hourlyDistribution(store().timers, '2026-03-08', '2026-03-08', at('2026-03-09'));
    assert.equal(spring[2], 0);
    assert.equal(spring.reduce((a, b) => a + b), 23 * hour);
    store().replaceIntervals(timer.id, [{start: at('2026-11-01'), end: at('2026-11-02')}]);
    const autumn = hourlyDistribution(store().timers, '2026-11-01', '2026-11-01', at('2026-11-02'));
    assert.equal(autumn[1], 2 * hour);
    assert.equal(autumn.reduce((a, b) => a + b), 25 * hour);
});

test('future selection creates no timer and deleting the last timer is safe', () => {
    const timer = create();
    store().selectDay('2099-01-01');
    assert.equal(store().timers.length, 1);
    store().deleteTimer(timer.id);
    assert.equal(store().timers.length, 1);
});

test('version-zero persisted history migrates once and preserves edits on subsequent reloads', async () => {
    const timer = {...create(), referenceDay: '2026-10-08', intervals: [{start: at('2026-10-01'), end: at('2026-10-08')}], accumulatedMs: 168 * hour};
    storage.set('timers-storage', JSON.stringify({state: {timers: [timer], activeTimerId: timer.id}, version: 0}));
    await useTimersStore.persist.rehydrate();
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
    assert.equal(JSON.parse(storage.get('timers-storage')!).version, 1);
    store().replaceIntervals(timer.id, [{start: at('2026-10-02'), end: at('2026-10-03')}]);
    await useTimersStore.persist.rehydrate();
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
    assert.equal(store().timers[0].accumulatedMs, 24 * hour);
});

test('new recorded sessions preserve older time accumulated without intervals', () => {
    const timer = create();
    store().updateTimer(timer.id, {accumulatedMs: 5 * hour});
    store().startInterval(timer.id, at('2026-10-02', 12));
    store().closeCurrentInterval(timer.id, at('2026-10-02', 13));
    assert.equal(store().timers[0].accumulatedMs, 6 * hour);
    assert.equal(store().timers[0].referenceDay, '2026-10-01');
    assert.equal(hourlyDistribution(store().timers, '2026-10-01', '2026-10-02', at('2026-10-03')).reduce((a, b) => a + b), hour);
    assert.equal(parseSegmentDate('2026-02-30T12:00'), null);
});
