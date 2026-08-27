import type {TrainingWeek} from "../../lib/training"

/**
 * EVERY WEEK OF TRAINING THE REPOSITORY HOLDS, COLLECTED FROM ITS SIBLINGS.
 *
 * ONE MODULE PER ISO WEEK, NAMED FOR THAT WEEK, AND WRITTEN BY A SCRIPT RATHER THAN BY HAND.
 * `scripts/fetch-strava-weeks.mjs` rewrites a whole week-year on every run, so a hand edit here
 * survives exactly until the next nightly. The filename is the KEY — it is the only place the
 * week is written down, which is why nothing inside a module repeats it and why
 * `tests/training.test.ts` holds every session in a file to the week the filename names.
 *
 * A MAP RATHER THAN AN ARRAY, because every consumer of this asks about a NAMED week: what is
 * `2026-W35`, what are the weeks of 2026, what does the spine draw at this position. An array
 * would make each of those a scan, and the key would then have to be stored inside the module
 * to survive the collection — a second home for the fact the filename already carries.
 *
 * SORTED BY KEY, which is chronological INSIDE one week-year and nowhere else: `2026-W53`
 * sorts after `2026-W01` correctly, and `2025-W52` sorts before both only because the years
 * differ in the same direction. A consumer ordering weeks ACROSS week-years must sort on
 * `isoWeekMonday` — see the note above it in `src/lib/training.ts`.
 *
 * THE GLOB IS WHY NOTHING MAY RE-EXPORT THIS MODULE FROM ANYTHING `uno.config.ts` IMPORTS.
 * That config's own import list is the census of which modules those are — read it there, and
 * follow it one hop further, since a module it imports drags in whatever IT imports. Those
 * modules are loaded through unconfig/jiti rather than Vite, and jiti has no
 * `import.meta.glob` — a re-export drags this line into that graph and kills `astro build` and
 * vitest itself, four lines of `glob is not a function` with no test executed. The same rule,
 * with the same measurement, is written out at the bottom of `src/data/races/index.ts`.
 *
 * AN EMPTY GLOB IS LEGAL AND MEANS EXACTLY WHAT IT SAYS: no week has been fetched yet. It is
 * not an error and no consumer may treat it as one — the first run of the fetcher is the only
 * thing that turns it into a series.
 */
const modules = import.meta.glob<{default: TrainingWeek}>("./*.ts", {eager: true})

export const WEEKS: ReadonlyMap<string, TrainingWeek> = new Map(
    Object.entries(modules)
        .map(([path, module]) => [path.replace(/^\.\//, "").replace(/\.ts$/, ""), module.default] as const)
        .sort(([a], [b]) => a.localeCompare(b)),
)
