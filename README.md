# Goal Timer

A React, TypeScript, Material UI, and Zustand timer app. Timers, goals, settings, and activity history are saved in the browser's localStorage.

## Development

```sh
yarn install
yarn dev
```

```sh
npm test
npm run lint
npm run build
```

Tests use Node's built-in TypeScript support (Node 22.6+). Deployment to GitHub Pages uses `npm run deploy`.

## Calendar and timers

Enable **Multiple timers** in Settings to show the calendar. Weeks start on Monday. Adjacent month days are dimmed but display totals and can be selected. Selecting an empty day creates one timer; selecting it again reuses that timer. The **+** button intentionally adds another timer to the selected day. Future days cannot create timers.

The calendar updates each second and on browser focus/visibility changes. When the day or month changes, a calendar viewing today follows the new date; browsing an older date stays in place. Changing days does not pause running timers or create new timers automatically.

A timer's assigned day is fixed at creation (the selected calendar date). Its entire duration belongs to that day, even when it runs or resumes on later days. Stop resets its time and history while retaining the assigned day. Existing histories are migrated using the earliest recorded start to recover the original date; migration retains timer IDs, totals, goals, and names.

Activity intervals are recorded regardless of whether the **Daily activity bar** is visible. The bar displays the assigned day's timeline. **Edit history** supports full start/end dates for multi-day sessions; a blank end keeps a segment running. History edits recalculate totals from the saved intervals.

## Stats

The Stats tab defaults to the last 30 days including today. Last 7 days, current month, and custom dates (up to one year) are also available.

- **Time spent each day:** assigns each timer's full total to its creation day, including ongoing time. Days with no time show zero.
- **Time by hour of day:** sums recorded activity within the selected period into 24 local clock-hour bins. Intervals crossing midnight or daylight-saving transitions are split by the actual hours spent. Sessions from timers created outside the period still contribute when they overlap it.

The two charts can have different totals because daily attribution and actual activity dates serve different purposes. Older accumulated time without activity intervals remains in daily totals but cannot be reconstructed in the hourly chart. Hover or focus chart points to inspect their values.
