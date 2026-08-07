/**
 * THE TWO GOALS AS AUTHORED, and the year every figure on the home page is measured
 * against. This is the configured half — a target, a name, an icon, a unit — and it is
 * where `total_goal` is edited. What the site READS is derived from it in
 * `src/lib/goal.ts`.
 *
 * `uno.config.ts` reaches this module through unconfig/jiti, by way of `src/lib/goal.ts`,
 * so the constraint written at the head of that file binds here too: no
 * `import.meta.glob`, no `astro:content`, no top-level `await`, no `.astro` import.
 */

import stravaProgress from "./strava-progress.json"

/**
 * The calendar year every figure on this page is year-to-date against: the bot's
 * km, `progress_last_year`, and the races in `src/data/races/`.
 *
 * It is a constant rather than `new Date().getFullYear()` on purpose. A derived
 * year rolls over at midnight UTC on 1 January and the page silently starts
 * reporting a fresh year's target against last year's races and last year's
 * closing kilometres, with every test still green. Pinned, the January rollover is
 * a deliberate edit.
 *
 * THE JANUARY CHECKLIST LIVES HERE, not in README.md, which has no section for it.
 * Three steps, and only the first is gated:
 *
 *   1. Bump this constant. `tests/projection.test.ts` asserts it matches the year
 *      in the bot's `updated_at`, so forgetting it fails the suite, which is the
 *      build command — the page cannot ship with the two out of step.
 *   2. Set each goal's `progress_last_year` from the closing totals. NOTHING checks
 *      this: the repo has no memory of last year's kilometres, so a stale figure
 *      renders happily. Read them off the bot JSON before step 1 overwrites it.
 *   3. Add the new year's races, one module each, under `src/data/races/`. DO NOT
 *      REMOVE LAST YEAR'S — this step said to until the wall became the whole
 *      calendar, and deleting a past
 *      race now deletes a Finisher Patch that was earned. They cost the goal cards
 *      nothing: `eventsInYear` in projection.ts hands those only the races that START
 *      in this year, so a past race contributes to no projection and a race booked for
 *      NEXT year cannot lower this year's required rate.
 */
export const GOAL_YEAR = 2026

/**
 * The shape `RAW_GOALS` is checked against. It is a separate type from `Goal` in
 * `src/lib/goal.ts` so the source can be `as const satisfies` — see `Sport` there for why an
 * annotation here would silently widen `sport` to `string` and break the join.
 * `raw_progress` is absent because it is derived there, not authored.
 */
type GoalSource = {
    total_goal: number
    current_progress: number
    progress_last_year: number | null
    goal_name: string
    short_name: string
    goal_logo: string
    measurable_unit: string
    sport: string
}

/*
 * current_progress is bot-owned — see .github/workflows/strava-progress.yml; edit the JSON,
 * not this file, to bump it manually.
 *
 * EXPORTED SO `src/lib/goal.ts` CAN READ IT TWICE: once to derive `GOALS`, and once for
 * `Sport`, which is `typeof RAW_GOALS[number]["sport"]`. That second read is why the `as
 * const satisfies` above is load-bearing rather than a style choice — the note on `Sport`
 * has the argument.
 */
export const RAW_GOALS = [{
    total_goal: 600,
    current_progress: stravaProgress.running_km,
    progress_last_year: null,
    goal_name: "Running",
    short_name: "Run",
    goal_logo: "ri:run-line",
    measurable_unit: "km",
    sport: "running"
}, {
    total_goal: 5000,
    current_progress: stravaProgress.cycling_km,
    progress_last_year: 1440.8,
    goal_name: "Cycling",
    short_name: "Ride",
    goal_logo: "ri:riding-line",
    measurable_unit: "km",
    sport: "cycling"
}] as const satisfies readonly GoalSource[]
