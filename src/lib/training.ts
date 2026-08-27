/**
 * A WEEK OF TRAINING, AND EVERY RULE FOR READING ONE.
 *
 * The site knew two numbers about a year — `cycling_km` and `running_km` — and nothing about
 * its shape. This module is the missing series: one module per ISO week under
 * `src/data/weeks/`, each holding that week's Strava sessions, written by
 * `scripts/fetch-strava-weeks.mjs` and never by hand.
 *
 * IT LIVES APART FROM THE WEEKS THEMSELVES, exactly as `./race.ts` lives apart from
 * `src/data/races/`: the data is one module per week, so a night's fetch is a set of files
 * rather than an edit into a list. This module is what those files are checked against.
 *
 * NOTHING HERE READS A CLOCK. Every function below takes what it needs as an argument.
 * `BUILD_DATE` in `./today.ts` is the site's clock and `UPDATED_AT` is the bot's stamp; the
 * two answer different questions and neither is read from here. See `CLAUDE.md`.
 *
 * THE SESSIONS ARE STORED AND EVERY TOTAL IS DERIVED, which is the decision this whole file
 * exists to make. A weekly total rests on three rules — the metres-to-kilometres conversion,
 * the week boundary, and the sport-type mapping — and each of the three has moved in this
 * project or its sibling. `kmFromMetres` alone has been set three times (see its note in
 * `./race.ts`). Storing a total would leave a stale figure behind on the next revision of any
 * of them; storing the sessions cannot.
 */
import {kmFromMetres} from "./race"
import type {Sport} from "./goal"

/**
 * ONE STRAVA ACTIVITY, REDUCED TO THE SIX FACTS THIS SITE KEEPS.
 *
 * The list is an ALLOW-LIST rather than a subset, and the difference is the whole point:
 * a deny-list lets a field Strava adds next year arrive in this repository silently.
 * `scripts/fetch-strava-weeks.mjs` PROJECTS onto exactly these keys and never spreads.
 *
 * THE HAZARD IS MEASURED RATHER THAN IMAGINED. A summary activity from
 * `GET /athlete/activities` carried 48 keys on 2026-08-27, and the ones this list drops are
 * not inert: over the 200 most recent, `name`, `map`, `start_latlng` and `end_latlng` were
 * present on all 200, `suffer_score` on 199, `device_name` on 195 and `average_heartrate` on
 * 170. No detail fetch is needed to leak any of them — one spread would do it.
 *
 * What is deliberately absent, and why:
 *   name, description        athlete-authored prose; nothing renders it
 *   map.summary_polyline     a route; the same rule the sibling training wiki enforces
 *   start_latlng, end_latlng a home address, in practice
 *   average_heartrate,
 *   max_heartrate,
 *   suffer_score             physiology. The owner's recorded decision keeps this private
 *   average_watts, gear_id,
 *   device_name              nothing on this site asks
 *
 * `metres` is stored EXACTLY as the API reported it, for the reason `Recording.metres`
 * in `./race.ts` gives: the conversion belongs at the edge, in one place, so a change to
 * the rounding rule cannot leave a stale figure behind.
 */
export type TrainingSession = {
    /** Strava's activity id, as a string. `Recording.id` is a string for the same reason. */
    id: string
    /** Strava's own `sport_type`, verbatim. {@link sportOf} is what maps it to a goal. */
    sport_type: string
    /** ISO local datetime, exactly Strava's `start_date_local` — see the note in {@link isoWeekKey}. */
    start_local: string
    /** The API's `distance`, verbatim. Zero is legal: a gym session records no distance. */
    metres: number
    /** The API's `moving_time`, in seconds. */
    moving_seconds: number
    /** The API's `elapsed_time`, in seconds. Never below `moving_seconds`. */
    elapsed_seconds: number
}

/** One ISO week's sessions. The key is the filename; nothing inside a week module repeats it. */
export type TrainingWeek = {
    sessions: readonly TrainingSession[]
}

/**
 * THE SIX KEYS ABOVE, AS DATA, so the gate and the script read the same list rather than two
 * lists that happen to agree. `tests/training.test.ts` holds every stored session's key set to
 * exactly this, which is the assertion that catches a spread.
 */
export const SESSION_KEYS = [
    "id", "sport_type", "start_local", "metres", "moving_seconds", "elapsed_seconds",
] as const

/**
 * AN ISO WEEK-YEAR IS NOT A CALENDAR YEAR, AND THE TWO CLAIMS MUST NEVER BE COLLAPSED INTO ONE.
 * Computed rather than assumed, on 2026-08-27, by running the function below over every day:
 *
 *   - `2026-W01` begins **Monday 29 December 2025**.
 *   - `2025-W01` begins **Monday 30 December 2024**, and `2030-W01` begins Monday 31 December
 *     2029. (An earlier draft of plan 045 wrote 29 December 2024 for the first of those; it is
 *     the 30th — 29 December 2024 was a Sunday, and so is the last day of `2024-W52`. The claim
 *     the date was offered as evidence for is unaffected: a W01 routinely begins in the
 *     previous calendar year.)
 *   - **2026 has 53 ISO weeks**, so `2026-W53` exists and runs Monday 28 December 2026 to
 *     Sunday 3 January 2027.
 *
 * THE TWO RULES THIS REPOSITORY ADOPTS, AND THEY ARE SEPARATE:
 *
 *   1. **A file's key is its ISO week key and carries no calendar-year claim.** `2026-W01.ts`
 *      holds the sessions of ISO week 2026-W01, three days of which fall in December 2025.
 *      That is correct and must not be "fixed". `tests/training.test.ts` asserts a module holds
 *      only its own ISO week and asserts NOTHING about the calendar year of what is inside it.
 *   2. **A page's year filter uses the week's MONDAY** ({@link isoWeekMonday}). So a 2026 page
 *      does not show `2026-W01`, whose Monday is in 2025.
 *
 * An earlier draft stated these as one rule — "a week belongs to the calendar year of its
 * Monday" — and let the filename inherit it. That is self-contradictory: it makes `2026-W01.ts`
 * a 2025 file, and it would have reddened the suite on 2026 itself.
 *
 * THE WHOLE ISO WEEK-YEAR Y COVERS EVERY DATE OF CALENDAR YEAR Y, which is what lets the
 * cross-check against the bot's year totals work at all: every day of 2026 falls inside
 * `2026-W01`…`2026-W53`, so a year's sessions are never split across two week-years' worth of
 * files.
 */

/** The `YYYY-MM-DD` head of a `start_local`, as a UTC midnight. */
const dayOf = (startLocal: string): Date => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(startLocal)
    if (!match) throw new Error(`Not an ISO local datetime: ${JSON.stringify(startLocal)}`)
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

/**
 * THE ISO-8601 WEEK A LOCAL DATETIME FALLS IN, as `2026-W35`.
 *
 * LOCAL, NOT UTC, AND THAT IS THE FIELD RATHER THAN A CONVERSION. Strava's
 * `start_date_local` is the wall clock where the activity was recorded, and it arrives
 * spelled with a trailing `Z` that is a lie — the API stamps one on a value that is not UTC.
 * Only the date head is read here, so the lie costs nothing; nothing in this module ever hands
 * that string to `new Date()`. A 06:02 Singapore ride is 22:02 the previous day in UTC, so
 * bucketing on `start_date` would move a Monday session into the week before. The same field
 * pair already moved a 1 January race out of `GOAL_YEAR` once.
 *
 * WEEKS RUN MONDAY TO SUNDAY and week 1 is the week containing the first Thursday of January
 * — equivalently, the week containing 4 January. The Thursday of a date's own week decides
 * the week-YEAR, which is why the offset below is taken before the year is read.
 *
 * DUPLICATED IN `scripts/fetch-strava-weeks.mjs` ON PURPOSE. That script is a zero-dependency
 * `.mjs` run by node in Actions with no build step, so it cannot import this file.
 * `tests/training.test.ts` runs both over one shared table of cases and asserts they agree on
 * every one — the duplication is gated, which a silent second implementation would not be.
 */
export const isoWeekKey = (startLocal: string): string => {
    const thursday = dayOf(startLocal)
    // Monday is 0. Step to this week's Thursday: that day's year IS the ISO week-year.
    thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3)
    const year = thursday.getUTCFullYear()
    const firstThursday = new Date(Date.UTC(year, 0, 4))
    firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3)
    const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000))
    return `${year}-W${String(week).padStart(2, "0")}`
}

/** A week key, split. Throws rather than returning a wrong week for a malformed one. */
const partsOf = (key: string): {year: number; week: number} => {
    const match = /^(\d{4})-W(\d{2})$/.exec(key)
    if (!match) throw new Error(`Not an ISO week key: ${JSON.stringify(key)}`)
    return {year: Number(match[1]), week: Number(match[2])}
}

/**
 * THE ISO DATE OF THAT WEEK'S MONDAY, as `2025-12-29` for `2026-W01`.
 *
 * This is rule 2 above: a page that filters by calendar year asks this rather than reading the
 * key's first four digits, because those four digits are a week-year and answer a different
 * question. It is also what orders a year's weeks on a page, since a key sorts correctly only
 * inside one week-year.
 */
export const isoWeekMonday = (key: string): string => {
    const {year, week} = partsOf(key)
    const fourth = new Date(Date.UTC(year, 0, 4))
    const monday = new Date(fourth.getTime())
    monday.setUTCDate(fourth.getUTCDate() - ((fourth.getUTCDay() + 6) % 7) + (week - 1) * 7)
    return monday.toISOString().slice(0, 10)
}

/** How many ISO weeks a week-year has — 52, or 53 when a year holds 53 Thursdays. */
export const isoWeeksInYear = (year: number): number =>
    partsOf(isoWeekKey(`${year}-12-28`)).week

/** Every ISO week key of one week-year, in order. `2026` yields `2026-W01`…`2026-W53`. */
export const isoWeekKeysOfYear = (year: number): readonly string[] =>
    Array.from({length: isoWeeksInYear(year)}, (_, i) => `${year}-W${String(i + 1).padStart(2, "0")}`)

/**
 * WHICH GOAL A STRAVA `sport_type` PAYS INTO, OR NEITHER.
 *
 * THIS MAP IS AN EMPIRICAL FACT ABOUT THIS ACCOUNT, NOT A DOCUMENTED ONE, and it was measured
 * rather than guessed. On 2026-08-27, over all 228 activities Strava returned for calendar year
 * 2026, the subset whose metres sum to `ytd_ride_totals.distance` is exactly `Ride`, and the
 * subset that sums to `ytd_run_totals.distance` is exactly `Run` and `TrailRun`. The residual
 * disagreement was 1.6 m on the ride total and 0.3 m on the run total — 0.0001 % of each.
 *
 * Seven other `sport_type` values appeared and pay into NEITHER goal: `Walk` (69 activities,
 * 258.0 km), `WeightTraining` (34), `Workout` (32), `HighIntensityIntervalTraining` (6),
 * `Hike` (3), `Kayaking` (2) and `Elliptical` (1). They are kept as sessions — the training
 * log is the whole week — and counted in no sport's total.
 *
 * AN UNKNOWN VALUE RETURNS `null`, AND THAT IS FAIL-LOUD RATHER THAN LENIENT. `VirtualRide`
 * and `EBikeRide` do not appear in this account's 2026 and so are deliberately NOT guessed at:
 * a guess that is wrong publishes a wrong total silently, where `null` makes the cross-check in
 * `tests/training.test.ts` go red the first night one is uploaded. The recovery is to re-run
 * the measurement and extend this map — not to loosen the tolerance.
 */
const SPORT_OF: Readonly<Record<string, Sport>> = {
    Ride: "cycling",
    Run: "running",
    TrailRun: "running",
}

export const sportOf = (sportType: string): Sport | null => SPORT_OF[sportType] ?? null

/**
 * ONE SESSION'S DISTANCE, AS A FIGURE THE SITE WOULD PRINT.
 *
 * IT REUSES `kmFromMetres` AND DOES NOT RESTATE IT. Plan 045 asked for a `kmOf(metres)`; this
 * is the same function under the name the rest of the repository already uses for a wrapper —
 * `recordingKm` in `./race.ts` is its sibling, taking the record rather than a bare number.
 * The rounding rule has been reversed twice and now lives on exactly one line; a second
 * spelling of it here is the thing that note exists to forbid.
 */
export const sessionKm = (session: TrainingSession): number => kmFromMetres(session.metres)

/** What a week adds up to. Every field is derived on read; none is stored. */
export type WeekTotals = {
    /** Every session's metres, whatever the sport. */
    metres: number
    /** Metres from sessions {@link sportOf} assigns to running. */
    run_metres: number
    /** Metres from sessions {@link sportOf} assigns to cycling. */
    ride_metres: number
    /** How many sessions the week holds — the count, not the list. */
    sessions: number
    /** Time actually moving, in seconds. Not elapsed: a week's stops are not training. */
    moving_seconds: number
}

/**
 * A WEEK'S TOTALS, SUMMED FROM ITS SESSIONS EVERY TIME THEY ARE ASKED FOR.
 *
 * `run_metres` and `ride_metres` do not add up to `metres`, and that is the design rather than
 * a rounding artefact: the seven unassigned `sport_type` values are inside `metres` and inside
 * neither of the other two. A caller that wants "everything else" subtracts.
 *
 * THE METRES ARE SUMMED AND CONVERTED ONCE, never converted and then summed — the same rule
 * `raceKm` follows for a split race. Each conversion drops whatever is under a hundredth, so
 * summing converted parts loses a little on every part.
 */
export const weekTotals = (week: TrainingWeek): WeekTotals => {
    const totals: WeekTotals = {metres: 0, run_metres: 0, ride_metres: 0, sessions: 0, moving_seconds: 0}
    for (const session of week.sessions) {
        totals.sessions += 1
        totals.metres += session.metres
        totals.moving_seconds += session.moving_seconds
        const sport = sportOf(session.sport_type)
        if (sport === "running") totals.run_metres += session.metres
        if (sport === "cycling") totals.ride_metres += session.metres
    }
    return totals
}
