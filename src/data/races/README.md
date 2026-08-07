# Races

One module per race. **Adding a race is writing a file** — no read-before-edit, no
unique-string match into a list in which three rows share the name
`Pesta Sukan Round Island Bike Adventure` and two share `OCBC Cycle Johor Bahru`.

Name it `YYYY-MM-DD-slug.ts`, export the race as the default, and the collector in
`src/data/races/index.ts` picks it up. The date in the filename is a **convenience for
whoever lists this directory** and carries no load: the collector sorts on the `date` field,
and `tests/data-contract.test.ts` holds the two in step so the filename can never become a
second, unchecked copy of the fact.

```ts
import type {RaceEvent} from "../../lib/race"

export default {date: "2026-12-06", name: "BYD Singapore International Marathon", advertised_km: 42.20, sport: "running", country: "Singapore"} satisfies RaceEvent
```

`satisfies RaceEvent` rather than an annotation, so the object keeps its literal types and a
misspelled key is still an error. `pnpm check` names the file and the missing field.

## Adding a race changes the page, and which page depends on when it is

**A booked race inside `GOAL_YEAR` moves the required rate.** Its kilometres are promised
distance the goal card counts as already coming, so the rate a reader is told they must hold
drops the moment the file lands — and every figure derived from that rate moves with it.
Adding one is a change to what the home page claims, not a quiet data edit.

**A past race moves no figure on the home page.** `eventsInYear` in `src/lib/projection.ts`
hands a goal card only the races that start in `GOAL_YEAR`, and a finished race's kilometres
are already inside the bot's total, so filling in the back catalogue only draws bibs on the
wall. That is the half of this rule the old note in `src/lib/constants.ts` stated on its own,
which is why it read as though a race were always just a data edit.

## Recording a race you have just run is TWO steps, and the order depends

The page is out by the length of the race until the second step lands, and the only choice is
which way it is out. There is no unconditional order.

**A race that is not yet a file here — FETCH FIRST.** Run
`gh workflow run strava-progress.yml`, let the bot bank the kilometres, then write the module.
Exact for the whole window: a race the site has never seen was never booked, so banking its
distance first can double nothing. The Garmin Run is this case.

**A race that is already a file here — ADD THE RECORDING FIRST**, then let the 05:13 cron move
the kilometres. This is every planned race, so it is the common case. Fetching first puts the
distance in BOTH places while the module still carries no `recordings`: measured on the
2 August ride, **66 km/wk against an honest 71** — the deficit subtracted twice, in the
flattering direction. Recording-first errs the other way (79) until the next push, and that
push is guaranteed because the race itself moved the kilometres.

Those are the figures the mistake actually produced rather than a simulation of it. Erring
high is the safe direction, not a harmless one — do not read it as licence to skip step two.

## Fields

The full argument for every one of these is on the declaration in `src/lib/race.ts`; this is
the checklist, and `tests/data-contract.test.ts` holds it against that file in both directions.

- `date` — **required.** ISO `YYYY-MM-DD`, the day the event starts. Must equal the filename's
  prefix.
- `name` — **required.** The race as the organiser calls it.
- `sport` — **required.** Joins the race to its goal.
- `country` — **required.** A country name a reader would say out loud, never a code or a flag.
  For a virtual event this is where it was RIDDEN, not where the event is branded.
- `end_date` — optional. Multi-day events only; a tour books across its span rather than
  landing whole on day one.
- `advertised_km` — the organiser's own distance. **Required on a race with no `recordings`**,
  because nothing else could give it one, and required again beside `official`, whose ledger
  row needs a distance from the same source as its clock.
- `outcome` — optional, and `"dnf"` is its only member. The one fact on a bib nothing can
  derive: no device models an abandonment, so it is told rather than looked up.
- `elapsed_time` — optional, `H:MM:SS`. Elapsed, never moving. Beside a recording it is what
  makes the bib a patch, whatever day it is.
- `recordings` — the Strava activities the race was recorded as, in the order they were
  ridden. A list, because a mechanical or a dead watch splits one race across several files.
  - `id` — the activity id, as a string.
  - `metres` — that activity's distance exactly as the API's `distance` reported it. Copy the
    number; do not convert it, round it, or read it off a page. Nothing offline can catch a
    mistyped one — only `tests/strava-verify.test.ts` can, and it is opt-in.
  - `elapsed_time` — **required**, `H:MM:SS`. THIS ACTIVITY's clock, not the race's: the bib's
    hero runs first start to last stop, and each link prints the part it actually opens, so a
    reader who follows one is never promised the summed figure.
- `official` — optional, and only beside an `advertised_km`. What the organiser's results
  sheet says, printed beside the ride rather than reconciled with it.
  - `net_time` — optional, `H:MM:SS`. Chip time: mat to mat.
  - `gun_time` — optional, `H:MM:SS`. Gun to finish mat, so the longer of the two.
  - `url` — optional. The public results page, where one exists.
