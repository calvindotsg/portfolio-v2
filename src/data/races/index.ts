import type {RaceEvent} from "../../lib/race"

/**
 * THIS IS THE WHOLE CALENDAR, NOT THIS YEAR'S, and that changed in the same revision
 * that gave the earned bib its name. Every race he has entered, in any year, stays
 * here: the wall draws all of it, because a Finisher Patch is a thing you keep. It
 * held one year until then, and the January checklist beside `GOAL_YEAR` in
 * `src/data/goals.ts` said to delete the old races; that step is now the opposite
 * instruction.
 *
 * ONE ARRAY, TWO SCOPES, AND THE SPLIT IS ENFORCED IN projection.ts RATHER THAN HERE.
 * The wall reads all of it; a goal card reads only the races that start in
 * `GOAL_YEAR` (`src/data/goals.ts`), because its target, its kilometres, its day count
 * and its own heading are all that year's. The rule and the failure it prevents are written
 * out above `eventsInYear`; the short version is that a race booked for next November
 * must not pay off this year's deficit.
 *
 * SO A PAST RACE NEEDS NOTHING BUT ITS FACTS. `elapsed_time` and
 * `recordings` are both optional, so a race remembered without a recording is
 * a complete bib rather than a broken one — which is what makes filling in a back
 * catalogue a data edit and not a code change.
 *
 * RECORDING A RACE YOU HAVE JUST RUN IS A TWO-STEP EDIT, AND WHICH STEP GOES FIRST
 * DEPENDS ON WHETHER THE RACE IS ALREADY ON THIS LIST. There is no order that is right at
 * both moments — the page is out by the length of the race until the second step lands,
 * and the only choice is which way it is out. THERE IS NO UNCONDITIONAL ORDER, and one
 * that claims "no figure on the page is ever wrong" measures wrong by 5 km/wk in the case
 * it gets backwards — 66 against the honest 71 below, which is where that figure comes
 * from and why it moves when they do.
 *
 * The two fields together are what tells the site the race has been RUN (see
 * `hasRecording` in projection.ts), and a run race stops being counted as booked ahead.
 * Its kilometres have to be somewhere: the bot's total is the only other place they can
 * be. So:
 *
 *   A RACE NOT YET ON THIS LIST — a one-off, or a back-catalogue entry. FETCH FIRST:
 *   `gh workflow run strava-progress.yml` (or the Run workflow button; it has always
 *   taken `workflow_dispatch`), then write its module here. Exact for the whole window,
 *   because a race that is not in `EVENTS` was never booked, so banking its kilometres
 *   first can double nothing. This is the Garmin Run case.
 *
 *   A RACE ALREADY ON THIS LIST — every planned race, which is the common case. ADD THE
 *   RECORDING FIRST, then let the 05:13 cron move the kilometres. Fetching first puts the
 *   distance in BOTH places while the race sits here without its recording: measured on
 *   the 2 August ride, 66 km/wk against an honest 71 — the deficit subtracted twice, in
 *   the FLATTERING direction this repository guards against everywhere else. Recording-first
 *   errs the other way (79) until the next push, and the push is guaranteed here because
 *   the race itself moved the kilometres, so `git diff --quiet` cannot suppress it.
 *
 *   THOSE ARE THE FIGURES THE MISTAKE ACTUALLY PRODUCED, not a simulation of it. This note
 *   first quoted 67 against 73, modelled before the ride from the event's ADVERTISED
 *   distance; the ride came in longer than the route, so the real pair landed one and two
 *   km/wk below the model. The hazard and its direction are unchanged — which is the point
 *   worth keeping: a simulated measurement is worth less than the incident's own, so when
 *   the hazard finally happens, replace the model with what it did.
 *
 * The rate erring HIGH is the safe direction rather than a harmless one — do not read it
 * as licence to skip the second step. And note this procedure quietly falsified a premise
 * stated elsewhere: the note above `daysRemaining` in projection.ts justifies counting the
 * stamped day by saying the cron "names a day whose riding is entirely ahead of anyone
 * reading the page". A hand-dispatched run after a race names a day whose riding is partly
 * done. That is why fetch-first double-counts at all.
 *
 * ONE MODULE PER RACE, AND THE FILENAME CARRIES NO LOAD THE FIELD DOES NOT ALREADY CARRY.
 * Every sibling of this file is one race, named `YYYY-MM-DD-slug.ts` so a directory listing
 * reads as a calendar — and the sort below asks the `date` FIELD first, falling back to the
 * glob key only to settle two races on the SAME DAY. That tiebreak is the whole of what the
 * filename decides: it makes the order total, so `src/pages/llms.txt.ts`, which renders this
 * array in order into a shipped artifact, cannot print two same-day races in whichever order
 * the glob happened to hand them over. Ordering on the key ALONE is the thing to refuse —
 * that would make the name a second, unchecked copy of a fact the row already states, and a
 * row renamed without being re-dated would silently misorder the artifact.
 * `tests/data-contract.test.ts` holds the two in step from the other side, and holds this
 * array to date order so the sort cannot quietly be simplified away.
 *
 * THE GLOB IS WHY NOTHING MAY RE-EXPORT THIS MODULE FROM ANYTHING `uno.config.ts` IMPORTS.
 * That config's own import list is the census of which modules those are — read it there, and
 * follow it one hop further, since a module it imports drags in whatever IT imports. An
 * enumeration here was wrong twice: it named four when the graph reached six, and the two it
 * omitted are exactly the ones a reader would not guess, one of them reached only by way of
 * another. Those modules are loaded through unconfig/jiti rather than Vite, and jiti has no
 * `import.meta.glob` — a re-export drags this line into that graph and kills `astro build` and
 * vitest itself, four lines of `glob is not a function` with no test executed.
 */
const modules = import.meta.glob<{default: RaceEvent}>("./*.ts", {eager: true})

export const EVENTS: readonly RaceEvent[] = Object.entries(modules)
    .map(([key, m]) => [key, m.default] as const)
    .sort(([ka, a], [kb, b]) => a.date.localeCompare(b.date) || ka.localeCompare(kb))
    .map(([, race]) => race)
