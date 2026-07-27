import stravaProgress from "../data/strava-progress.json"
import {EVENTS, GOAL_YEAR, type Goal, type RaceEvent, type Sport} from "./constants"

/**
 * WHAT THIS FILE REFUSES TO COMPUTE, and why that is the whole design.
 *
 * The obvious thing to put on a goal card is a projected year-end total:
 * `current + observed_pace * days_remaining + booked_race_km`. It is wrong, and it
 * is wrong in a way that reads as authoritative.
 *
 * THE DOUBLE COUNT. The owner had already ridden 318.72 km of races this year when
 * this was written, and those kilometres are inside the bot's `cycling_km`. So they
 * are already inside the observed pace, and adding the 1,143.98 km of BOOKED races
 * on top counts race riding twice. That single error is the entire source of the
 * "on track, +144 km" verdict the naive formula produces: strip it out and the same
 * projection reads 96 km SHORT.
 *
 * WHY NOT JUST FIX IT. Because the corrected models do not agree either. Removing
 * the past races from the pace gives 4,904 km; also accounting for the fact that a
 * nine-day tour REPLACES nine days of ordinary riding rather than adding to it
 * gives 4,810. Against a 5,000 km goal, three defensible models land on both sides
 * of the line — and the closest of them flips from "short" to "on track" after
 * 55 more kilometres, about six days' riding. A card that prints one of those
 * numbers is not reporting a fact about the year; it is reporting a modelling
 * choice, in the voice of a measurement.
 *
 * SO THE CARD SHOWS A REQUIRED RATE INSTEAD. `(goal - ridden - booked) / weeks
 * remaining` extrapolates nothing. It contains no pace term, so the composition of
 * what is already banked cannot corrupt it, and it claims nothing about what the
 * owner will do. It still carries the point the owner cared about — counting his
 * booked races takes cycling from 121 km/wk to 71 km/wk, a 42% reduction — without
 * a forecast.
 *
 * THE COMPARATOR RULE, if a pace is ever displayed beside this. It must be the
 * DE-RACED pace, never the observed one. The required rate already has future race
 * km subtracted; setting it next to an observed pace that still contains past race
 * km reimports the double count by juxtaposition, and the reader does the wrong
 * subtraction themselves. The three figures are 65.99 (de-raced) < 70.28 (required)
 * < 76.72 (observed) — the requirement sits BETWEEN the two paces, which is exactly
 * why picking the wrong one flips the story.
 *
 * ---
 *
 * EVERYTHING HERE IS PURE AND TAKES `today` AS AN ARGUMENT. Nothing calls
 * `new Date()`. A build-time clock would make every rendered figure drift daily and
 * every assertion about them non-deterministic — and it would be wrong anyway,
 * because the bot only redeploys when the kilometres move, so a fresh clock would
 * be divided into stale distance. `today` comes from the bot's own `updated_at`,
 * so the numerator and the denominator age together.
 *
 * This module deliberately lives outside `constants.ts`: that file is imported by
 * `uno.config.ts`, and arithmetic there would be evaluated during CSS generation.
 */

/** The bot's stamp: the day the kilometres last MOVED, not the day they were last checked. */
export const UPDATED_AT: string = stravaProgress.updated_at

const MS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7

/** `YYYY-MM-DD` -> UTC midnight. Returns NaN for anything that is not a real date. */
export function parseIsoDate(iso: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN
    const ms = Date.parse(`${iso}T00:00:00Z`)
    if (Number.isNaN(ms)) return NaN
    // `Date.parse` normalises rather than rejects: "2026-02-30" silently becomes
    // 2 March. Round-trip it so an impossible day fails instead of shifting.
    return new Date(ms).toISOString().slice(0, 10) === iso ? ms : NaN
}

/** Whole days from `iso` to 31 December of `GOAL_YEAR`, never negative. */
export function daysRemaining(iso: string, year: number = GOAL_YEAR): number {
    const from = parseIsoDate(iso)
    if (Number.isNaN(from)) return NaN
    const end = Date.parse(`${year}-12-31T00:00:00Z`)
    return Math.max(0, Math.round((end - from) / MS_PER_DAY))
}

/**
 * Booked distance for a sport that has NOT been ridden yet as of `iso`.
 *
 * A multi-day event is counted pro rata across its span. Booking the whole of a
 * nine-day tour on its start date would drop this figure by the tour's full
 * distance the moment it begins, while the rider has covered one day of it.
 */
export function bookedAhead(sport: Sport, iso: string, events: readonly RaceEvent[] = EVENTS): number {
    const today = parseIsoDate(iso)
    if (Number.isNaN(today)) return NaN
    let km = 0
    for (const e of events) {
        if (e.sport !== sport) continue
        if (!Number.isFinite(e.km) || e.km < 0) continue
        const start = parseIsoDate(e.date)
        if (Number.isNaN(start)) continue
        const end = e.end_date ? parseIsoDate(e.end_date) : start
        if (Number.isNaN(end) || end < start) continue
        if (today <= start) { km += e.km; continue }        // wholly ahead
        if (today > end) continue                            // wholly done
        // Mid-event: the days not yet ridden, inclusive of today.
        const totalDays = Math.round((end - start) / MS_PER_DAY) + 1
        const doneDays = Math.round((today - start) / MS_PER_DAY)
        km += e.km * ((totalDays - doneDays) / totalDays)
    }
    return km
}

/**
 * What the card can say about a goal. A discriminated union rather than a number,
 * because the honest answer is a different SENTENCE in each case and a caller that
 * receives only a number will invent the wrong one — a met goal and a goal needing
 * 0.4 km/wk both round to "0 km/wk to go".
 */
export type GoalStatus =
    /** Already at or past the target. */
    | {kind: "met"}
    /** Booked races alone cover the remainder; no ordinary training needed. */
    | {kind: "covered"; km: number}
    /** The year is over. */
    | {kind: "closed"}
    /** Under a fortnight left — a weekly rate is the wrong unit at that range. */
    | {kind: "final"; km: number; days: number}
    /** The ordinary case: kilometres per week, rounded UP. */
    | {kind: "rate"; kmPerWeek: number; km: number; days: number}
    /** Inputs did not parse. Render nothing rather than a guess. */
    | {kind: "unknown"}

/** Below this many days remaining, a weekly rate misleads and an absolute total does not. */
const FINAL_STRETCH_DAYS = 14

export function goalStatus(goal: Goal, iso: string = UPDATED_AT, events: readonly RaceEvent[] = EVENTS): GoalStatus {
    const {raw_progress: ridden, total_goal: target} = goal
    if (!Number.isFinite(ridden) || !Number.isFinite(target) || target <= 0) return {kind: "unknown"}

    // Checked BEFORE the deficit, and the order matters: a met goal and a goal
    // needing nothing more are different sentences, and `raw_progress` is the
    // unclamped figure precisely so this branch can fire.
    if (ridden >= target) return {kind: "met"}

    const days = daysRemaining(iso)
    const booked = bookedAhead(goal.sport, iso, events)
    if (Number.isNaN(days) || Number.isNaN(booked)) return {kind: "unknown"}

    const km = target - ridden - booked
    if (km <= 0) return {kind: "covered", km: target - ridden}
    if (days <= 0) return {kind: "closed"}
    if (days < FINAL_STRETCH_DAYS) return {kind: "final", km: Math.ceil(km), days}

    // CEIL, not round or floor, and this is a correctness choice rather than taste.
    // The requirement is 70.28 km/wk; floor and round both give 70, and a rider
    // following 70 exactly delivers 1,570 km against the 1,576.32 needed — a rate
    // that MISSES the goal. Ceil never under-states what is required. One km/wk is
    // 0.45% of the cycling goal but 3.74% of the running one, so the same rounding
    // step is eight times as consequential on the smaller card.
    const kmPerWeek = Math.ceil(km / (days / DAYS_PER_WEEK))
    return {kind: "rate", kmPerWeek, km, days}
}

/**
 * The card's third line, or null to render nothing.
 *
 * EVERY STRING HERE IS WIDTH-BUDGETED, and the budget is small. The text sits in a
 * 110.02px column — the right-hand card's inner flex column, which is narrower than
 * the card's own content box and does not widen with the viewport (it is constant
 * from 1024px to 1440px, because that column is a fixed 264px at `lg`). Measured at
 * 12px in the page's own stack:
 *
 *     1000 km/wk to go        99.31   worst case of the rate branch, fits by 10.7
 *     71 km/wk to go          83.56
 *     1000 km to go           80.11   worst case of the final branch
 *     Races cover it          78.78
 *     Goal met                50.22
 *     Booked races cover it  121.06   WRAPS — this was the first wording, and it
 *                                     wrapped at every viewport
 *
 * A wrap is not cosmetic here: it costs a second 20px line, and the right-hand
 * stack has 18px of free height left once both goal cards carry one line. The next
 * line makes the flex column shrink all three cards, the Now card included.
 * `tests/projection.test.ts` pins the literals below against these measurements, so
 * changing the copy without re-measuring fails.
 */
export function goalStatusLine(goal: Goal, iso: string = UPDATED_AT, events: readonly RaceEvent[] = EVENTS): string | null {
    const s = goalStatus(goal, iso, events)
    switch (s.kind) {
        case "met": return "Goal met"
        case "covered": return "Races cover it"
        case "closed": return null
        case "final": return `${s.km} ${goal.measurable_unit} to go`
        case "rate": return `${s.kmPerWeek} ${goal.measurable_unit}/wk to go`
        case "unknown": return null
    }
}

/**
 * Guards the one silent-wrongness mode this data has: the bot's stamp belonging to
 * a different year than the goals are measured against. It would leave a fresh
 * year's near-zero kilometres divided by last year's day count, with nothing
 * failing. Asserted in the test suite rather than thrown at build time — a
 * mis-stamped JSON should fail CI, not blank the page.
 */
export function stampYearMatchesGoalYear(iso: string = UPDATED_AT, year: number = GOAL_YEAR): boolean {
    return !Number.isNaN(parseIsoDate(iso)) && Number(iso.slice(0, 4)) === year
}

/** "2026-07-27" -> "27 July 2026". Full month name: it fits the footer's tightest
 *  182px at the worst date the calendar offers, and it hands a screen reader a word
 *  rather than the token "Jul". */
const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]

export function formatDateline(iso: string = UPDATED_AT): string | null {
    if (Number.isNaN(parseIsoDate(iso))) return null
    const [y, m, d] = iso.split("-")
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}
