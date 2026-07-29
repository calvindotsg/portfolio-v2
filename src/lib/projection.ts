import stravaProgress from "../data/strava-progress.json"
import {EVENTS, GOAL_YEAR, type Goal, NEXT_RACE, type RaceEvent, type Sport} from "./constants"

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
 * booked races takes cycling from 122 km/wk to 71 km/wk, a 42% reduction — without
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
 * EVERY NUMBER IN THIS COMMENT IS AS OF THE 2026-07-28 STAMP, and is stated that way
 * because they drift with the bot. They are here to carry a rule that does not
 * drift; re-derive them before quoting one as current.
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

/**
 * THE ONE SCOPE RULE ON THIS SITE, AND EVERY DEFAULT BELOW IS AN APPLICATION OF IT:
 *
 *     the patch wall is the WHOLE calendar; a goal card is GOAL_YEAR alone.
 *
 * It did not need saying while {@link EVENTS} held one year — "every race" and "this
 * year's races" were the same list, so no function had to choose. The wall keeps every
 * race the owner has entered now, which makes them different lists, and the difference
 * is not cosmetic. A race that has not been run is `booked` whatever year it is in, so
 * without this split {@link bookedAhead} subtracts a race booked for NEXT November from
 * THIS year's deficit: the 1,022 km Formosa tour alone takes the cycling card from
 * "71 km/wk to go" to "Races cover it", silently, under a heading that says this year.
 *
 * So the five functions a GOAL CARD reads — {@link bookedAhead}, {@link goalStatus},
 * {@link goalStatusLine}, {@link nextRace} and {@link patchesEarned} — default to this
 * year's races, and the two the WALL reads — {@link patchWall} and {@link patchState} —
 * default to all of them. The `events` parameter still means "these events, whatever
 * you pass" in every case: the year lives in the DEFAULT, where `GOAL_YEAR` already
 * lives (see {@link daysRemaining}), so a caller handing over a fixture gets exactly
 * the list it handed over and every test below stays a test of the arithmetic.
 *
 * A RACE BELONGS TO THE YEAR IT STARTS IN. No arithmetic, and it is how a person files
 * one. The event that would probe the rule — a span crossing new year — is not on this
 * calendar, and would count wholly into the year it began; that is also what the
 * single-year array already did with it, so nothing changed direction here.
 *
 * AN UNPARSEABLE DATE FALLS OUT OF THE YEAR, and the direction is deliberate: a race
 * missing from `bookedAhead` makes the required rate HIGHER, never lower, so a typo
 * cannot flatter the card. The wall still draws the bib — `patchState` calls an
 * unreadable date booked — so the bad data is visible on the site rather than silently
 * dropped from it.
 */
export function eventsInYear(year: number, events: readonly RaceEvent[] = EVENTS): readonly RaceEvent[] {
    return events.filter((e) => !Number.isNaN(parseIsoDate(e.date)) && e.date.slice(0, 4) === String(year))
}

/** This year's races: the goal cards' calendar. Computed once — `EVENTS` is a constant. */
const GOAL_YEAR_EVENTS: readonly RaceEvent[] = eventsInYear(GOAL_YEAR)

/**
 * Riding days from `iso` to 31 December of `GOAL_YEAR`, counting BOTH ends, never
 * negative.
 *
 * INCLUSIVE IS NOT A STYLE CHOICE — `bookedAhead` forces it. That function counts
 * an event starting on `iso` as wholly ahead (`today <= start`), so it treats the
 * stamped day as still to be ridden. The two are the numerator and the denominator
 * of one fraction and must agree on that day; an exclusive count divides the
 * deficit by one day too few and over-states the rate the card asks for.
 *
 * The bot settles which way to agree. `updated_at` is stamped by a cron that fires
 * at 05:13 Singapore time, naming a day whose riding is entirely ahead of anyone
 * reading the page. So the stamped day counts, and `bookedAhead` was the one that
 * already had it right.
 *
 * THE KNOCK-ON, accepted deliberately: 31 December returns 1 rather than 0, so the
 * last day of the year reads as `final` ("N km to go") instead of `closed`
 * (renders nothing). It is a real riding day. `closed` now begins on 1 January.
 */
export function daysRemaining(iso: string, year: number = GOAL_YEAR): number {
    const from = parseIsoDate(iso)
    if (Number.isNaN(from)) return NaN
    const end = Date.parse(`${year}-12-31T00:00:00Z`)
    return Math.max(0, Math.round((end - from) / MS_PER_DAY) + 1)
}

/**
 * Booked distance for a sport that has NOT been ridden yet as of `iso`.
 *
 * A multi-day event is counted pro rata across its span. Booking the whole of a
 * nine-day tour on its start date would drop this figure by the tour's full
 * distance the moment it begins, while the rider has covered one day of it.
 *
 * IT COUNTS ONLY THIS YEAR'S RACES, which is carried by the default rather than by
 * anything in the loop below — see the scope rule above {@link eventsInYear}. Pass a
 * list and it books whatever is in it; the year is not smuggled into the arithmetic.
 */
export function bookedAhead(sport: Sport, iso: string, events: readonly RaceEvent[] = GOAL_YEAR_EVENTS): number {
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
    /** The year is over — from 1 January, since 31 December is still a riding day. */
    | {kind: "closed"}
    /** Under a fortnight left — a weekly rate is the wrong unit at that range. */
    | {kind: "final"; km: number; days: number}
    /** The ordinary case: kilometres per week, rounded UP. */
    | {kind: "rate"; kmPerWeek: number; km: number; days: number}
    /** Inputs did not parse. Render nothing rather than a guess. */
    | {kind: "unknown"}

/** Below this many days remaining, a weekly rate misleads and an absolute total does not. */
const FINAL_STRETCH_DAYS = 14

export function goalStatus(goal: Goal, iso: string = UPDATED_AT, events: readonly RaceEvent[] = GOAL_YEAR_EVENTS): GoalStatus {
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
    // At the 2026-07-28 stamp the requirement is 70.2818 km/wk; floor and round both
    // give 70, and a rider following 70 exactly delivers 1,570.00 km against the
    // 1,576.32 needed — a rate that MISSES the goal. Round is wrong on any date whose
    // requirement has a fractional part below .5, which is most of them: sweeping this
    // function over the rest of the calendar gives 154 of the 288 remaining sport-days
    // that land in this branch. Ceil never under-states what is required. One km/wk is
    // 0.45% of the cycling goal but 3.74% of the running one, so the same rounding
    // step is eight times as consequential on the smaller card.
    const kmPerWeek = Math.ceil(km / (days / DAYS_PER_WEEK))
    return {kind: "rate", kmPerWeek, km, days}
}

/**
 * The card's third line, or null to render nothing.
 *
 * EVERY STRING HERE IS WIDTH-BUDGETED. The ceiling is the goal card's ROW content
 * width — **182px at 1024px wide, 201 at 1100, 214 from 1152 up** — and the widest
 * single line that fits at 1024 is about 156.7px of ink. Measured at 12px in the
 * page's own stack:
 *
 *     1000 km/wk to go        99.31   worst case of the rate branch
 *     71 km/wk to go          83.56
 *     1000 km to go           80.11   worst case of the final branch
 *     Races cover it          78.78
 *     Goal met                50.22
 *
 * BE CAREFUL WHICH BOX YOU MEASURE — an earlier revision of this comment got it
 * wrong and stated the budget as 110.02px. That figure is the RUNNING card's inner
 * `max-content` column, which is not a budget at all: it widens with its own
 * content, and the cycling card's is 125.89px. The same error carried a claim that
 * `Booked races cover it` "wraps at every viewport"; it does not — measured on the
 * built page it is ONE line at 1024/1100/1152/1440 with the card height unchanged
 * at 226 and no overflow. The shorter wording below ships because it is plainer,
 * not because the longer one broke.
 *
 * The line COUNT is the real constraint, and it is about height rather than width:
 * the right-hand stack has 18px of free height once both goal cards carry one line,
 * and a second line takes it to zero — at which point the flex column contracts all
 * three cards, the Now card included, 154 -> 149.39px. Glyphs are not sheared until
 * FOUR lines, so the budget protects the Now card, not against clipping.
 * `tests/projection.test.ts` pins the literals below against these measurements.
 */
export function goalStatusLine(goal: Goal, iso: string = UPDATED_AT, events: readonly RaceEvent[] = GOAL_YEAR_EVENTS): string | null {
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

// ---------------------------------------------------------------------------
// The patch wall. Everything below serves /patches; nothing above it reads any
// of this, and the goal cards are unchanged by it.
// ---------------------------------------------------------------------------

/**
 * Whether a bib has been EARNED, derived from the calendar and never stored.
 *
 * {@link RaceEvent} has no `done` flag and must not gain one. A stored flag rots in
 * the one direction nobody notices: a race that has been run keeps rendering as
 * still-to-come, indefinitely, with the build green and the page confidently wrong.
 * Derivation cannot do that — the wall is rebuilt on every deploy and the bot
 * deploys whenever the kilometres move.
 *
 * `finished` MEANS THE WHOLE EVENT IS BEHIND THE STAMP, and it is spelled with the
 * same comparison `bookedAhead` uses for "wholly done" on purpose. The two answer
 * the same question — has this race happened yet — for two different consumers, and
 * a wall that calls the Formosa tour finished while the cycling card is still
 * counting its kilometres as booked is the page contradicting itself on one screen.
 *
 * A MULTI-DAY EVENT IN PROGRESS IS THEREFORE `booked`, which is a choice rather than
 * a fallout of the comparison: you earn the bib at the finish line, not at the start
 * one, and the outline treatment says exactly "not yet". `bookedAhead` disagrees in
 * a way that is correct for its own job — it counts the untravelled days of a tour
 * pro rata, because it is measuring distance rather than completion.
 *
 * AN UNPARSEABLE DATE IS `booked`. That direction is deliberate and is the only one
 * available: the alternative failure renders a race nobody has run as finished, and
 * a page that claims a result is worse than a page that claims a plan.
 */
export type PatchState = "finished" | "booked"

/** The last day an event occupies — its own date unless it spans several. */
const eventEnd = (event: RaceEvent): string => event.end_date ?? event.date

export function patchState(event: RaceEvent, iso: string = UPDATED_AT): PatchState {
    const today = parseIsoDate(iso)
    const end = parseIsoDate(eventEnd(event))
    if (Number.isNaN(today) || Number.isNaN(end)) return "booked"
    return today > end ? "finished" : "booked"
}

export type Patch = {event: RaceEvent, state: PatchState}

/**
 * The wall: every race, or every race of one sport, NEXT RACE FIRST — the booked
 * races in ascending date order, then the finished ones in descending.
 *
 * EVERY RACE MEANS EVERY YEAR. This is the one function whose default is the whole of
 * {@link EVENTS}, and the sort needs nothing added for it: both runs already point away
 * from today, so the finished run walks backwards out of this year into the last one and
 * the one before it, which is the order a person reads a history in. A bib prints its
 * full year, so nothing here has to draw a boundary between them.
 *
 * The goal cards see a subset — see the scope rule above {@link eventsInYear} — and that
 * is the whole of the difference between this and {@link nextRace} two functions down.
 *
 * WHY NOT NEWEST-FIRST, WHICH THIS REPLACED. One flat descending sort means "most
 * recent thing at the top", and on a calendar that runs past today that buries the
 * race the owner is actually training for at the BOTTOM of the booked group, three
 * further-away races above it. Both groups therefore start at today and move away
 * from it, in opposite directions: booked counts forward (2 Aug, 27 Sep, 7–15 Nov,
 * 6 Dec) and finished counts back (12 Jul, 10 Jul).
 *
 * WHICH MAKES THE STATE PART OF THE SORT KEY, and that is the one thing here that
 * can surprise a caller: this order is a function of `iso`, so the same fixture
 * reorders itself as races fall behind the stamp — and on the day after the last
 * race the booked run empties and the whole wall is plain descending. That is the
 * intended behaviour, not a degenerate case, and it is why the tests assert the
 * shape of the order at pinned dates rather than the order of today's calendar.
 *
 * THE GROUP BOUNDARY IS NOT DRAWN, because the bibs already draw it: a booked bib is
 * an outline wearing the word BOOKED and a finished one is a solid inverted face, so
 * the two runs read as two blocks with nothing between them. A heading or rule would
 * belong to the page, not to this function.
 *
 * SORTED HERE RATHER THAN IN THE FIXTURE, and the reason is a defect that already
 * shipped once in the design previews for this feature: their captions claimed an
 * order the array happened to supply, and nobody read the render against the
 * caption. {@link EVENTS} is hand-edited in date order because that is the order a
 * person adds races in, so relying on it would mean the wall's ordering is a
 * property of how the list was typed.
 *
 * THE ORDER IS TOTAL, which is why `name` breaks the tie rather than leaving it to
 * the sort's stability: a tie resolved by fixture position is the same defect as
 * sorting in the fixture, just narrower. {@link EVENTS} has no same-day pair today —
 * the two Phuket legs are two days apart — so the tie is exercised by a fixture in
 * the tests rather than by the calendar, and a weekend double is one edit away.
 *
 * THE TIEBREAK IS ASCENDING IN BOTH GROUPS, deliberately out of step with the dates.
 * Reversing it inside the finished group would make the printed order of two
 * same-day races depend on whether they have happened yet, which is a stranger rule
 * than one alphabetical tiebreak that never moves.
 */
const STATE_RANK: Record<PatchState, number> = {booked: 0, finished: 1}

export function patchWall(
    sport?: Sport,
    iso: string = UPDATED_AT,
    events: readonly RaceEvent[] = EVENTS,
): Patch[] {
    return events
        .filter((e) => sport === undefined || e.sport === sport)
        .map((event) => ({event, state: patchState(event, iso)}))
        .sort((a, b) => {
            if (a.state !== b.state) return STATE_RANK[a.state] - STATE_RANK[b.state]
            if (a.event.date !== b.event.date) {
                const earlierFirst = a.event.date < b.event.date ? -1 : 1
                return a.state === "booked" ? earlierFirst : -earlierFirst
            }
            return a.event.name < b.event.name ? -1 : a.event.name > b.event.name ? 1 : 0
        })
}

/** "JUL", for a bib's date line. Three letters is what fits beside the sport mark. */
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3).toUpperCase())

/**
 * An event's date as a bib prints it, BROKEN INTO THE PIECES A `<time>` CAN CLAIM:
 * "12 JUL 2026" for a day, "7–15 NOV 2026" for a tour.
 *
 * A SPAN IS COLLAPSED TO WHAT ACTUALLY DIFFERS, so the nine-day tour reads as nine
 * days without spending a second month and year saying so. The alternative — one
 * date, the start — understates a 1,022 km event as a single day's ride, on the one
 * bib where the distance makes that reading absurd.
 *
 * Three shapes, and the boundaries between them are the calendar's rather than a
 * preference: same month and year collapses to `7–15 NOV 2026`; a span crossing a
 * month keeps both months (`30 NOV – 2 DEC 2026`); a span crossing new year keeps
 * both years too. The en dash is a range dash and is deliberately not a hyphen.
 *
 * WHY SEGMENTS RATHER THAN ONE STRING. `<time datetime>` names ONE instant, and HTML
 * has no interval form for it — so a tour rendered as `<time datetime="2026-11-07">`
 * around the text "7–15 NOV 2026" tells a machine the nine-day event happened on the
 * 7th. A review of the patch wall caught exactly that shipping. The endpoints are
 * separable, so each gets its own element and the dash between them belongs to
 * neither; the segment with no `iso` is punctuation and the caller renders it as text.
 *
 * {@link formatPatchDate} is DERIVED from this rather than written beside it, which is
 * the point: two functions producing the same string is how the range a reader sees
 * and the dates a machine reads start to disagree, and that is the defect one layer up
 * from the one being fixed here.
 *
 * Returns null on an unparseable date, for the same reason everything else here
 * does: the caller renders nothing rather than a guess.
 */
export type PatchDateSegment = {
    text: string
    /** The day this segment names, `YYYY-MM-DD`. Absent on the range dash. */
    iso?: string
}

export function patchDateSegments(event: RaceEvent): PatchDateSegment[] | null {
    const from = event.date
    const to = eventEnd(event)
    const start = parseIsoDate(from)
    const end = parseIsoDate(to)
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null

    const part = (iso: string) => {
        const [y, m, d] = iso.split("-")
        return {d: String(Number(d)), m: MONTHS_SHORT[Number(m) - 1], y}
    }
    const a = part(from)
    const b = part(to)
    if (start === end) return [{text: `${a.d} ${a.m} ${a.y}`, iso: from}]
    if (a.y !== b.y) {
        return [{text: `${a.d} ${a.m} ${a.y}`, iso: from}, {text: " – "}, {text: `${b.d} ${b.m} ${b.y}`, iso: to}]
    }
    if (a.m !== b.m) {
        return [{text: `${a.d} ${a.m}`, iso: from}, {text: " – "}, {text: `${b.d} ${b.m} ${b.y}`, iso: to}]
    }
    return [{text: a.d, iso: from}, {text: "–"}, {text: `${b.d} ${a.m} ${a.y}`, iso: to}]
}

/** The same date line as one string. See {@link patchDateSegments}, which owns it. */
export function formatPatchDate(event: RaceEvent): string | null {
    const segments = patchDateSegments(event)
    return segments === null ? null : segments.map((s) => s.text).join("")
}

/**
 * THE NEXT RACE FOR A SPORT, and it is deliberately the FIRST ENTRY OF THAT SPORT'S
 * WALL rather than a second sort over {@link EVENTS}.
 *
 * {@link patchWall} already orders booked races ascending ahead of finished ones, so
 * its first booked entry is by definition the next one. Re-deriving that here with
 * another comparator is how the goal card and the wall come to disagree about which
 * race is next — the same failure the wall's own docstring describes for the fixture,
 * one level up. One derivation, two consumers.
 *
 * `daysAway` COUNTS FROM THE STAMP TO THE START DAY and can be NEGATIVE, which is not
 * a bug to clamp: a multi-day event stays booked for every day it runs (you earn the
 * bib at the finish line), so mid-tour the start is behind the stamp while the race is
 * still the next one. `underWay` is that case named, so a caller does not have to
 * decide what "in -3 days" means.
 *
 * Returns null when the sport has nothing booked — every race run, or none entered.
 * That is a state the site passes through every January and again the morning after
 * the last race, so it is an ordinary branch and not an error.
 *
 * NEXT MEANS NEXT THIS YEAR, because this is a goal card's line and a goal card is one
 * year (see {@link eventsInYear}). So the days between a year's last race and 31 December
 * return `null` even with January's race already on the calendar, and the card offers the
 * year's patch count instead. That is the cost of the scope rule and it is paid
 * deliberately: the alternative counts down to a race whose kilometres every other figure
 * on the card refuses to count. The race is one click away on the wall, which is the
 * object that keeps the whole calendar.
 */
export type NextRace = {
    event: RaceEvent
    /** Days from the stamp to the START day. Negative while a multi-day race runs. */
    daysAway: number
    /** True when the race has begun and has not finished. */
    underWay: boolean
}

export function nextRace(
    sport: Sport,
    iso: string = UPDATED_AT,
    events: readonly RaceEvent[] = GOAL_YEAR_EVENTS,
): NextRace | null {
    const next = patchWall(sport, iso, events).find((p) => p.state === "booked")
    if (next === undefined) return null
    const start = parseIsoDate(next.event.date)
    const today = parseIsoDate(iso)
    if (Number.isNaN(start) || Number.isNaN(today)) return null
    const daysAway = Math.round((start - today) / MS_PER_DAY)
    return {event: next.event, daysAway, underWay: daysAway < 0}
}

/**
 * Patches already earned for a sport — what the card offers when nothing is booked.
 *
 * THIS YEAR'S, not the owner's whole collection, and the difference now exists: the wall
 * keeps every race he has ever entered. A lifetime count under a heading that reads "My
 * cycling goal this year", beside three year-to-date figures, would be one figure in a
 * different unit from its neighbours — the mixed-scope defect this repo has already had
 * to correct once. The lifetime number has a home, and it is the wall's own filter row.
 */
export function patchesEarned(
    sport: Sport,
    iso: string = UPDATED_AT,
    events: readonly RaceEvent[] = GOAL_YEAR_EVENTS,
): number {
    return patchWall(sport, iso, events).filter((p) => p.state === "finished").length
}

/**
 * Where the countdown stops counting in days and starts counting in weeks.
 *
 * A FORTNIGHT RATHER THAN A WEEK, because the rung it would otherwise print is the one
 * that reads worst: "in 1 week" is vaguer than "in 9 days" while being no shorter, and a
 * single week is a span a reader already holds in days. Starting at 14 means the smallest
 * week count this can produce is two, which is also why there is no singular string.
 */
const DAYS_BEFORE_WEEKS = 14

/**
 * THE SENTENCE THE GOAL CARD PRINTS, and it lives here rather than in the component so
 * that the tests can assert the wording rules against the real thing. A component that
 * assembled this inline would leave the suite either untested or asserting a copy of the
 * branch — which is a test that cannot fail.
 *
 * Two shapes of day, not a happy path and a fallback. While a race is booked the line
 * counts down to it; while none is, it offers what has been earned. Nothing is booked for
 * a sport every January before its first race and again from the morning after its last,
 * so both are ordinary.
 *
 * `underWay` is checked BEFORE the day count for the reason it exists: mid-tour the start
 * is behind the stamp, and the arithmetic branch would print "in -3 days".
 *
 * THE WEEK COUNT IS FLOORED, AND THAT DIRECTION IS DELIBERATE. 61 days is eight weeks and
 * five days; floored it reads "in 8 weeks", which says the race arrives sooner than it
 * does, and rounded it would read "in 9 weeks", which says there is a week of preparation
 * that does not exist. Of the two ways to be wrong by up to six days, the one that leaves
 * the reader early is the safe one. The exact date is on the bib either way.
 */
export function nextRaceLine(next: NextRace | null, earned: number): string {
    if (next === null) {
        if (earned === 0) return NEXT_RACE.none
        return earned === 1 ? NEXT_RACE.earned_one : NEXT_RACE.earned.replace("{count}", String(earned))
    }
    if (next.underWay) return NEXT_RACE.under_way
    if (next.daysAway === 0) return NEXT_RACE.today
    if (next.daysAway === 1) return NEXT_RACE.tomorrow
    if (next.daysAway < DAYS_BEFORE_WEEKS) return NEXT_RACE.in_days.replace("{days}", String(next.daysAway))
    return NEXT_RACE.in_weeks.replace("{weeks}", String(Math.floor(next.daysAway / 7)))
}
