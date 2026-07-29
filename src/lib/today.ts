/**
 * THE SITE'S ONLY CLOCK. This is the one module under `src/` that reads the time,
 * and it exists because the site had no clock at all and was using a data-freshness
 * stamp as one.
 *
 * WHAT WENT WRONG WITHOUT IT. `projection.ts` defaulted every "today" to the bot's
 * `updated_at`, which does not mean today — it means "the day the kilometres last
 * MOVED", and it is deliberately frozen when they do not move so the workflow's
 * `git diff --quiet` gate can stop a commit-push-deploy every night. Measured against
 * the shipped script rather than argued: feed `nextProgress` unchanged kilometres on
 * 12 August and it still returns `updated_at: 2026-07-28`. So the stamp drifts from
 * the calendar by however long the owner rests, and every question of the form "has
 * this race happened yet" drifted with it. The visible symptom on 29 July 2026: the
 * home page said the 2 August ride was "in 5 days", counting from the 28th. It was 4.
 *
 * WHY BUILD TIME, WHICH IS THE ONLY SOURCE AVAILABLE. The obvious alternative is to
 * have the bot write today's date into its JSON — a `checked_at` beside `updated_at`.
 * That cannot work here: a field that changes nightly makes the file differ on every
 * run BY CONSTRUCTION, so the `git diff --quiet` gate can never fire and the repo
 * commits, pushes and redeploys every night forever. The gate's own comment in
 * `scripts/fetch-strava-progress.mjs` says so. A static site therefore has exactly one
 * free source of "today": the moment it is built.
 *
 * AND THE LIMIT OF THAT, stated so nobody reads more into it. A prerendered page is
 * only as fresh as its last deploy, so this cannot fix a page nobody rebuilt. What it
 * does fix is every page that IS rebuilt — under the stamp, a fresh deploy could still
 * render a stale calendar, which is the strictly worse failure and the one that was
 * shipping.
 *
 * SINGAPORE, NOT UTC, and the reason is the same one the bot script gives: the cron
 * fires at 21:13 UTC, which is 05:13 the NEXT morning in Singapore, so a UTC-derived
 * date is off by one for the only reader this site has. `en-CA` yields ISO order.
 *
 * THE PURE/IMPURE SPLIT IS THE POINT OF THE MODULE. `projection.ts` opens by promising
 * that everything in it is pure and takes `today` as an argument, and that promise is
 * worth keeping — it is what lets every assertion in the suite pin its own day. So the
 * clock is read exactly once, here, and injected there as a DEFAULT ARGUMENT. Nothing
 * in `projection.ts` calls `new Date()`, and no caller has to know what day it is.
 */

/**
 * A `Date` as the Singapore calendar day, `YYYY-MM-DD`. Pure: it reads no clock.
 *
 * DUPLICATED FROM `scripts/fetch-strava-progress.mjs` ON PURPOSE. That script is a
 * zero-dependency `.mjs` run by node in Actions, and it cannot import a `.ts`; making
 * the site import the script instead would pull `node:fs` and the Strava fetch into
 * the page build to reuse five lines. The copies are held in step by a test that runs
 * both over the same instants — see "the site's clock" in `tests/projection.test.ts`.
 */
export function singaporeDate(now: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now)
}

/**
 * The day this build believes it is — the single impure value in `src/`.
 *
 * Read once at module load, so every page in one build shares one day and cannot
 * disagree with itself across a midnight that falls mid-build.
 *
 * IT IS PRINTED INTO THE PAGE as `<meta name="build-date">`, and that is a test
 * requirement before it is a nicety: several assertions compare a rendered wall
 * against `patchWall()` recomputed in the test process. Recomputing the clock there
 * would compare a page built yesterday against today — which is exactly what
 * `SKIP_BUILD=1` does while iterating, and it would redden correct code. Reading the
 * day off the artifact asks the only fair question: was this page right for the day
 * it was drawn for?
 */
export const BUILD_DATE: string = singaporeDate(new Date())
