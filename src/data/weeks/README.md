# Weeks

One module per ISO week, holding that week's Strava sessions. **Nothing here is written by
hand.** `scripts/fetch-strava-weeks.mjs` rewrites a whole week-year on every run, so an edit
made here survives until the next nightly and no longer. That is the difference between this
directory and `src/data/races/` next door, where adding a race *is* writing a file.

```ts
import type {TrainingWeek} from "../../lib/training"

export default {sessions: [
    {id: "12058884605", sport_type: "Ride", start_local: "2026-08-24T06:02:11Z", metres: 42123.4, moving_seconds: 5400, elapsed_seconds: 5620},
]} satisfies TrainingWeek
```

`satisfies TrainingWeek` rather than an annotation, so the object keeps its literal types and a
misspelled key is still an error.

## The filename is the key

`2026-W35.ts` holds ISO week 2026-W35, and nothing inside the module repeats that. The
collector in `index.ts` reads the key off the filename, and `tests/training.test.ts` holds every
session in a file to the week the filename names.

**An ISO week-year is not a calendar year, and a boundary file is correct rather than broken.**
`2026-W01.ts` legitimately holds sessions dated December 2025 — ISO week 2026-W01 begins Monday
29 December 2025 — and the module for `2026-W53` will hold sessions dated January 2027. Do not
"fix" either. A page that filters by calendar year asks `isoWeekMonday`, not the key's first
four digits; the whole argument is on `isoWeekKey` in `src/lib/training.ts`.

## Fields

Six, and they are an **allow-list**, not a subset. A Strava summary activity carried 48 keys
when this was measured; a spread or a `delete` would put an athlete-authored title, a route
polyline, a pair of coordinates and a heart rate into this repository. `scripts/fetch-strava-weeks.mjs`
projects onto exactly these six, one key at a time, and `tests/training.test.ts` asserts the
projection rather than the fixture. The full argument is on `TrainingSession` in
`src/lib/training.ts`.

- `id` — the Strava activity id, as a string.
- `sport_type` — Strava's own value, verbatim. `sportOf` is what maps it to a goal, and it maps
  three of them; the rest are kept as sessions and counted in no sport's total.
- `start_local` — Strava's `start_date_local`, verbatim. Local wall clock, spelled with a
  trailing `Z` the API stamps on a value that is not UTC. Only its date head is ever read.
- `metres` — the API's `distance`, verbatim. Zero is legal: a gym session records no distance.
  Do not convert it here; `kmFromMetres` owns the conversion and owns it once.
- `moving_seconds` — the API's `moving_time`.
- `elapsed_seconds` — the API's `elapsed_time`. Never below `moving_seconds`.

## Why sessions and not weekly totals

A total is a derived value resting on three rules — the metres-to-kilometres conversion, the
week boundary, and the sport-type mapping — and every one of the three has moved in this project
or its sibling. Storing the source and deriving at the edge is what keeps a rule change from
leaving a stale figure behind. `weekTotals` in `src/lib/training.ts` is where a total comes
from, and **writing one into a file here is the one thing this directory exists to refuse.**

## An unchanged run writes byte-identical files

Fixed key order, 4-space indent, a trailing newline, sessions sorted by `start_local` then `id`.
That is not tidiness: `.github/workflows/strava-progress.yml` commits only when the index has
something in it, and unstable output would mean a commit, a merge and a production deploy every
single night. Running the fetcher twice in a row must leave `git status --porcelain
src/data/weeks/` empty on the second run.
